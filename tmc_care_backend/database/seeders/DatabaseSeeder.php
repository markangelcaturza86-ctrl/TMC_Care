<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Document;
use App\Models\FinancialRequest;
use App\Models\IncidentReport;
use App\Models\Message;
use App\Models\MessageReply;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- Departments ---
        $departments = collect([
            ['name' => 'Office of Student Affairs', 'head' => 'Dr. Ramon Villareal', 'staff' => 6, 'description' => 'Oversees student welfare, discipline, and incident resolution.'],
            ['name' => 'Guidance & Counseling', 'head' => 'Ms. Ivy Tan-Ocampo', 'staff' => 4, 'description' => 'Handles counseling referrals and psychosocial support cases.'],
            ['name' => 'Finance & Scholarship Office', 'head' => 'Mr. Edgar Malabanan', 'staff' => 5, 'description' => 'Reviews and releases financial assistance requests.'],
            ['name' => 'Campus Security', 'head' => 'SO1 Bartolome Reyes', 'staff' => 8, 'description' => 'First responders for on-campus incidents and safety concerns.'],
            ['name' => 'Registrar\'s Office', 'head' => 'Mrs. Corazon Fajardo', 'staff' => 3, 'description' => 'Verifies enrollment status supporting requests.'],
        ])->map(fn ($d) => Department::create($d));

        // --- Roles ---
        $roles = collect([
            ['name' => 'Super Administrator', 'description' => 'Full system access including settings, roles, and audit logs.', 'permissions' => ['View Dashboard', 'Manage Reports', 'Manage Requests', 'Manage Users', 'Manage Verifications', 'Send Communications', 'Manage System Settings', 'View Audit Logs']],
            ['name' => 'Case Officer', 'description' => 'Reviews and processes incident reports and financial requests.', 'permissions' => ['View Dashboard', 'Manage Reports', 'Manage Requests', 'Manage Verifications']],
            ['name' => 'Finance Reviewer', 'description' => 'Verifies documents and releases approved financial assistance.', 'permissions' => ['View Dashboard', 'Manage Verifications', 'Manage Requests (Financial)']],
            ['name' => 'Front Desk / Encoder', 'description' => 'Encodes new reports and requests submitted in person.', 'permissions' => ['View Dashboard', 'Create Reports', 'Create Requests']],
            ['name' => 'Student', 'description' => 'Can submit incident reports and financial assistance requests.', 'permissions' => ['Submit Report', 'Submit Request', 'Track Own Requests']],
        ])->map(fn ($r) => Role::create($r));

        [$superAdmin, $caseOfficer, $financeReviewer, $frontDesk, $studentRole] = $roles;
        [$osa, $guidance, $finance, $security, $registrar] = $departments;

        // --- Admin / staff users (all password: "password") ---
        $adminSeed = [
            ['name' => 'Admin User', 'email' => 'admin@tmc.edu.ph', 'role' => $superAdmin, 'department' => $osa, 'status' => 'Active', 'color' => '#2F6FED'],
            ['name' => 'Ivy Tan-Ocampo', 'email' => 'ivy.tanocampo@tmc.edu.ph', 'role' => $caseOfficer, 'department' => $guidance, 'status' => 'Active', 'color' => '#7C3AED'],
            ['name' => 'Edgar Malabanan', 'email' => 'edgar.malabanan@tmc.edu.ph', 'role' => $financeReviewer, 'department' => $finance, 'status' => 'Active', 'color' => '#16A34A'],
            ['name' => 'Bartolome Reyes', 'email' => 'bartolome.reyes@tmc.edu.ph', 'role' => $caseOfficer, 'department' => $security, 'status' => 'Active', 'color' => '#EA580C'],
            ['name' => 'Corazon Fajardo', 'email' => 'corazon.fajardo@tmc.edu.ph', 'role' => $frontDesk, 'department' => $registrar, 'status' => 'Inactive', 'color' => '#0F766E'],
        ];

        $users = collect($adminSeed)->map(fn ($u) => User::create([
            'name' => $u['name'],
            'email' => $u['email'],
            'password' => Hash::make('password'),
            'role_id' => $u['role']->id,
            'department_id' => $u['department']->id,
            'status' => $u['status'],
            'last_active_at' => now()->subMinutes(random_int(2, 300)),
            'avatar_color' => $u['color'],
        ]));

        // --- Students ---
        $programs = ['BS Information Technology', 'BS Criminology', 'BS Elem. Education', 'BS Accountancy', 'BS Hospitality Mgmt', 'BS Nursing', 'BS Civil Engineering', 'BS Psychology'];
        $years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
        $firstNames = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Rosa', 'Carlos', 'Liza', 'Mark', 'Grace', 'Paolo', 'Kristine', 'Ramon', 'Bea', 'Miguel', 'Angela', 'Noel', 'Charmaine', 'Ferdinand', 'Joy'];
        $lastNames = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Ramos', 'Mendoza', 'Torres', 'Flores', 'Villanueva', 'Bautista', 'Aquino', 'Castillo', 'Rivera', 'Gonzales', 'Cruz'];

        $students = collect(range(0, 39))->map(function ($i) use ($firstNames, $lastNames, $programs, $years) {
            $first = $firstNames[$i % count($firstNames)];
            $last = $lastNames[($i * 3 + 1) % count($lastNames)];
            return Student::create([
                'student_no' => '2021-' . (10234 + $i),
                'name' => "$first $last",
                'email' => strtolower($first) . '.' . strtolower(str_replace(' ', '', $last)) . '@students.tmc.edu.ph',
                'program' => $programs[($i * 2) % count($programs)],
                'year' => $years[$i % count($years)],
                'status' => $i % 13 === 0 ? 'Inactive' : 'Active',
                'date_joined' => sprintf('2021-%02d-15', ($i % 8) + 1),
                'phone' => '09' . substr((string) (170000000 + $i * 12345), 0, 9),
            ]);
        });

        // --- Incident reports ---
        $incidentTypes = ['Bullying / Harassment', 'Property Damage', 'Theft', 'Physical Altercation', 'Vandalism', 'Health Emergency', 'Verbal Abuse', 'Cyberbullying', 'Lost Item'];
        $locations = ['Main Building, 2nd Floor', 'Gymnasium', 'Canteen', 'Parking Area', 'Library', 'Computer Laboratory', 'Student Center', 'Science Building', 'Field / Grounds'];
        $statuses = ['Submitted', 'Under Review', 'Investigating', 'Resolved', 'Dismissed'];
        $priorities = ['Low', 'Medium', 'High', 'Critical'];
        $staffNames = ['Bartolome Reyes', 'Ivy Tan-Ocampo', 'Admin User'];

        $incidents = collect(range(0, 33))->map(function ($i) use ($students, $incidentTypes, $locations, $statuses, $priorities, $staffNames) {
            $student = $students[$i % $students->count()];
            $status = $statuses[$i % count($statuses)];
            $isAnon = $i % 7 === 0;
            return IncidentReport::create([
                'code' => 'IR-2024-' . str_pad((string) (76 - $i), 4, '0', STR_PAD_LEFT),
                'type' => $incidentTypes[$i % count($incidentTypes)],
                'reported_by' => $isAnon ? 'Anonymous' : $student->name,
                'student_id' => $isAnon ? null : $student->id,
                'location' => $locations[($i * 2 + 1) % count($locations)],
                'date_submitted' => sprintf('2024-05-%02d', ($i % 27) + 1),
                'status' => $status,
                'priority' => $priorities[($i * 3) % count($priorities)],
                'assigned_to' => $status === 'Submitted' ? 'Unassigned' : $staffNames[$i % count($staffNames)],
                'description' => 'Student-submitted account of the incident describing what happened, who was involved, and any immediate concerns raised at the time of the report.',
            ]);
        });

        // --- Financial requests ---
        $assistanceTypes = ['Hospital / Medical Bills', 'Medicine Expenses', 'Transportation', 'Food & Daily Needs', 'School-related Expenses', 'Other Expenses'];
        $financialStatuses = ['Submitted', 'Under Verification', 'Additional Documents', 'Approved', 'Partially Approved', 'Declined', 'Assistance Released'];
        $amounts = [1500, 2500, 3000, 4200, 5000, 6800, 8000, 10000];

        $financialRequests = collect(range(0, 24))->map(function ($i) use ($students, $assistanceTypes, $financialStatuses, $amounts) {
            $student = $students[($i * 3) % $students->count()];
            $status = $financialStatuses[$i % count($financialStatuses)];
            $amountRequested = $amounts[$i % count($amounts)];
            $amountApproved = in_array($status, ['Approved', 'Partially Approved', 'Assistance Released'])
                ? ($status === 'Partially Approved' ? round($amountRequested * 0.6) : $amountRequested)
                : null;

            return FinancialRequest::create([
                'code' => 'FR-2024-' . str_pad((string) (52 - $i), 4, '0', STR_PAD_LEFT),
                'student_id' => $student->id,
                'student_name' => $student->name,
                'program' => $student->program,
                'type' => $assistanceTypes[$i % count($assistanceTypes)],
                'amount_requested' => $amountRequested,
                'amount_approved' => $amountApproved,
                'date_submitted' => sprintf('2024-05-%02d', ($i % 27) + 1),
                'status' => $status,
                'reason' => 'Request submitted with supporting documentation citing financial hardship affecting continued enrollment or wellbeing.',
            ]);
        });

        // --- Documents (attached to first few financial/incident records) ---
        $docSeed = [
            ['name' => 'Certificate of Indigency.pdf', 'linked' => $financialRequests->firstWhere('code', 'FR-2024-0052'), 'type' => 'financial_request', 'status' => 'Verified', 'size' => 412000],
            ['name' => 'Hospital Bill.pdf', 'linked' => $financialRequests->firstWhere('code', 'FR-2024-0052'), 'type' => 'financial_request', 'status' => 'Pending', 'size' => 1150000],
            ['name' => 'Enrollment Verification.pdf', 'linked' => $financialRequests->firstWhere('code', 'FR-2024-0051'), 'type' => 'financial_request', 'status' => 'Pending', 'size' => 220000],
            ['name' => 'Photo Evidence.jpg', 'linked' => $incidents->firstWhere('code', 'IR-2024-0076'), 'type' => 'incident_report', 'status' => 'Verified', 'size' => 3400000],
            ['name' => 'Medical Certificate.pdf', 'linked' => $financialRequests->firstWhere('code', 'FR-2024-0049'), 'type' => 'financial_request', 'status' => 'Rejected', 'size' => 540000],
            ['name' => 'Witness Statement.pdf', 'linked' => $incidents->firstWhere('code', 'IR-2024-0074'), 'type' => 'incident_report', 'status' => 'Verified', 'size' => 180000],
            ['name' => 'Receipt.pdf', 'linked' => $financialRequests->firstWhere('code', 'FR-2024-0049'), 'type' => 'financial_request', 'status' => 'Pending', 'size' => 96000],
        ];
        foreach ($docSeed as $idx => $d) {
            if (! $d['linked']) continue;
            Document::create([
                'code' => 'DOC-' . str_pad((string) (142 - $idx), 4, '0', STR_PAD_LEFT),
                'name' => $d['name'],
                'owner' => $d['type'] === 'financial_request' ? $d['linked']->student_name : ($d['linked']->reported_by ?? 'Anonymous'),
                'linked_type' => $d['type'],
                'linked_id' => $d['linked']->id,
                'linked_code' => $d['linked']->code,
                'file_path' => null,
                'size_bytes' => $d['size'],
                'status' => $d['status'],
                'uploaded_at' => now()->subDays($idx),
            ]);
        }

        // --- Announcements ---
        $announcementSeed = [
            ['title' => 'Please review all pending requests and verifications regularly to ensure timely assistance.', 'audience' => 'All Staff', 'postedBy' => 'Admin', 'pinned' => true],
            ['title' => 'Scholarship & financial assistance application window opens June 3 for AY 2024-2025.', 'audience' => 'All Students', 'postedBy' => 'Finance & Scholarship Office', 'pinned' => false],
            ['title' => 'Reminder: incident reports involving minors must be escalated to Guidance within 24 hours.', 'audience' => 'Case Officers', 'postedBy' => 'Office of Student Affairs', 'pinned' => false],
            ['title' => 'System maintenance scheduled May 30, 10:00 PM - 12:00 AM. Expect brief downtime.', 'audience' => 'All Staff', 'postedBy' => 'Admin', 'pinned' => false],
            ['title' => 'New anonymous reporting channel now available on the student portal.', 'audience' => 'All Students', 'postedBy' => 'Campus Security', 'pinned' => false],
        ];
        foreach ($announcementSeed as $idx => $a) {
            Announcement::create([
                'code' => 'AN-' . str_pad((string) (14 - $idx), 3, '0', STR_PAD_LEFT),
                'title' => $a['title'],
                'audience' => $a['audience'],
                'posted_by' => $a['postedBy'],
                'pinned' => $a['pinned'],
                'created_at' => now()->subDays($idx * 2),
                'updated_at' => now()->subDays($idx * 2),
            ]);
        }

        // --- Messages ---
        $maria = $students->firstWhere('name', 'Maria Santos') ?? $students[1];
        $juan = $students->firstWhere('student_no', '2021-10234') ?? $students[0];
        $msg1 = Message::create(['code' => 'MSG-201', 'from_name' => 'Maria Santos', 'subject' => 'Follow-up on FR-2024-0051', 'student_id' => $maria->id, 'unread' => true]);
        MessageReply::create(['message_id' => $msg1->id, 'from_name' => 'Maria Santos', 'body' => 'Good day po, gusto ko lang po sana malaman kung ano na po status ng aking request para sa financial assistance.']);

        $msg2 = Message::create(['code' => 'MSG-200', 'from_name' => 'Juan Dela Cruz', 'subject' => 'Additional documents uploaded', 'student_id' => $juan->id, 'unread' => true]);
        MessageReply::create(['message_id' => $msg2->id, 'from_name' => 'Juan Dela Cruz', 'body' => 'Hi, I\'ve uploaded the hospital bill you requested for my case FR-2024-0052.']);
        MessageReply::create(['message_id' => $msg2->id, 'from_name' => 'Admin User', 'body' => 'Thank you, Juan. We\'ll review this within 2 business days.']);

        $msg3 = Message::create(['code' => 'MSG-199', 'from_name' => 'Carlos Mendoza', 'subject' => 'Witness statement clarification', 'unread' => false]);
        MessageReply::create(['message_id' => $msg3->id, 'from_name' => 'Carlos Mendoza', 'body' => 'Sir/Ma\'am, may tanong lang po ako tungkol sa aking isinumite na witness statement kanina.']);

        // --- Audit logs ---
        $logSeed = [
            ['actor' => 'Admin User', 'action' => 'Approved financial request FR-2024-0052', 'target' => 'FR-2024-0052', 'ip' => '192.168.1.14'],
            ['actor' => 'Bartolome Reyes', 'action' => 'Updated incident report status to Investigating', 'target' => 'IR-2024-0076', 'ip' => '192.168.1.22'],
            ['actor' => 'Edgar Malabanan', 'action' => 'Verified document Enrollment Verification.pdf', 'target' => 'DOC-0140', 'ip' => '192.168.1.09'],
            ['actor' => 'Admin User', 'action' => 'Sent announcement to All Students', 'target' => 'AN-013', 'ip' => '192.168.1.14'],
            ['actor' => 'Ivy Tan-Ocampo', 'action' => 'Assigned IR-2024-0074 to Bartolome Reyes', 'target' => 'IR-2024-0074', 'ip' => '192.168.1.31'],
            ['actor' => 'Admin User', 'action' => 'Created new admin account for Noel Villafuerte', 'target' => 'ADM-006', 'ip' => '192.168.1.14'],
            ['actor' => 'Corazon Fajardo', 'action' => 'Rejected document Medical Certificate.pdf', 'target' => 'DOC-0138', 'ip' => '192.168.1.45'],
            ['actor' => 'Admin User', 'action' => 'Updated role permissions for Finance Reviewer', 'target' => 'R-03', 'ip' => '192.168.1.14'],
        ];
        foreach ($logSeed as $idx => $l) {
            AuditLog::create([
                'code' => 'LOG-' . (3021 - $idx),
                'actor' => $l['actor'], 'action' => $l['action'], 'target' => $l['target'], 'ip' => $l['ip'],
                'created_at' => now()->subHours($idx * 5),
                'updated_at' => now()->subHours($idx * 5),
            ]);
        }
    }
}
