<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Donation;
use App\Models\FinancialRequest;
use App\Models\Remittance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Department treasurers (CCS, CCJE, COAD, CAS, COED): collect donations from
 * their own department for the approved donation drives, then hand the cash to
 * the TMC Treasurer. The drive total only counts cash the TMC Treasurer has
 * confirmed as received.
 */
class CollectionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $deptId = $user->department_id;

        $drives = FinancialRequest::where('status', 'Approved')
            ->orderBy('drive_deadline')->get()
            ->map(function ($r) use ($deptId) {
                $sum = fn (string $status) => (float) Donation::where('financial_request_id', $r->id)
                    ->where('department_id', $deptId)->where('status', $status)->sum('amount');

                return [
                    'id' => $r->code,
                    'beneficiary' => $r->student_name,
                    'type' => $r->type,
                    'target' => (float) ($r->amount_approved ?? $r->amount_requested),
                    'collected' => (float) $r->amount_collected,          // confirmed by the TMC Treasurer
                    'deadline' => $r->drive_deadline?->format('Y-m-d'),
                    'held' => $sum('Collected'),                           // still with this department
                    'pending' => $sum('Remitted'),                         // handed over, not yet confirmed
                    'received' => $sum('Received'),                        // confirmed
                ];
            })->values();

        $donations = Donation::with('financialRequest')
            ->where('department_id', $deptId)->orderByDesc('id')->limit(100)->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'requestCode' => $d->financialRequest?->code,
                'donor' => $d->donor_name,
                'amount' => (float) $d->amount,
                'receivedOn' => $d->received_on?->format('Y-m-d'),
                'notes' => $d->notes,
                'status' => $d->status,
            ])->values();

        $remittances = Remittance::with(['financialRequest', 'department'])
            ->where('department_id', $deptId)->orderByDesc('id')->limit(50)->get()
            ->map(fn ($r) => $r->summary())->values();

        return response()->json([
            'department' => $user->department?->name,
            'drives' => $drives,
            'donations' => $donations,
            'remittances' => $remittances,
        ]);
    }

    public function addDonation(Request $request)
    {
        $data = $request->validate([
            'financial_request' => ['required', 'string'],
            'donor_name' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'received_on' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:150'],
        ]);
        $user = $request->user();

        $drive = FinancialRequest::where('code', $data['financial_request'])->firstOrFail();
        abort_unless($drive->status === 'Approved', 422, 'This donation drive is not open.');

        $donor = trim($data['donor_name'] ?? '');

        $donation = Donation::create([
            'financial_request_id' => $drive->id,
            'donor_name' => $donor !== '' ? $donor : 'Anonymous',
            'amount' => $data['amount'],
            'received_on' => $data['received_on'] ?? now()->toDateString(),
            'recorded_by' => $user->name,
            'notes' => $data['notes'] ?? null,
            'department_id' => $user->department_id,
            'status' => 'Collected',
        ]);

        AuditLog::record(
            $user->name,
            'Collected PHP ' . number_format((float) $donation->amount, 2) . " from {$donation->donor_name} for {$drive->code}",
            $drive->code
        );

        return response()->json(['id' => $donation->id], 201);
    }

    public function deleteDonation(Request $request, Donation $donation)
    {
        $user = $request->user();

        abort_unless($donation->department_id === $user->department_id, 403, 'This donation belongs to another department.');
        abort_unless($donation->status === 'Collected', 422, 'Only donations you still hold can be removed.');

        $donation->delete();

        AuditLog::record(
            $user->name,
            'Removed collected donation of PHP ' . number_format((float) $donation->amount, 2) . " from {$donation->donor_name}",
            $donation->financialRequest?->code
        );

        return response()->json(['message' => 'Removed']);
    }

    /** Hand over every donation still held for one drive to the TMC Treasurer. */
    public function remit(Request $request)
    {
        $data = $request->validate(['financial_request' => ['required', 'string']]);
        $user = $request->user();

        $drive = FinancialRequest::where('code', $data['financial_request'])->firstOrFail();

        $remittance = DB::transaction(function () use ($drive, $user) {
            $held = Donation::where('financial_request_id', $drive->id)
                ->where('department_id', $user->department_id)
                ->where('status', 'Collected')->lockForUpdate()->get();

            abort_if($held->isEmpty(), 422, 'You have no collected donations to hand over for this drive.');

            $seq = (Remittance::max('id') ?? 0) + 1;
            $remittance = Remittance::create([
                'code' => 'RM-' . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
                'financial_request_id' => $drive->id,
                'department_id' => $user->department_id,
                'amount' => $held->sum('amount'),
                'status' => 'Pending',
                'submitted_by_id' => $user->id,
                'submitted_by' => $user->name,
            ]);

            Donation::whereIn('id', $held->pluck('id'))
                ->update(['status' => 'Remitted', 'remittance_id' => $remittance->id]);

            return $remittance;
        });

        AuditLog::record(
            $user->name,
            'Handed over PHP ' . number_format((float) $remittance->amount, 2) . " to the TMC Treasurer for {$drive->code} ({$remittance->code})",
            $remittance->code
        );

        return response()->json($remittance->load(['financialRequest', 'department'])->summary(), 201);
    }
}
