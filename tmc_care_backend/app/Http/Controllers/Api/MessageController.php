<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\MessageReply;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index()
    {
        return response()->json(
            Message::with('replies')->latest()->get()->map(fn ($m) => $this->format($m))
        );
    }

    public function markRead(Message $message)
    {
        $message->update(['unread' => false]);
        return response()->json($this->format($message->load('replies')));
    }

    public function reply(Request $request, Message $message)
    {
        $data = $request->validate(['body' => ['required', 'string']]);
        MessageReply::create([
            'message_id' => $message->id,
            'from_name' => $request->user()?->name ?? 'Admin User',
            'body' => $data['body'],
        ]);
        return response()->json($this->format($message->load('replies')));
    }

    private function format(Message $m): array
    {
        $lastReply = $m->replies->last();
        return [
            'id' => $m->code,
            'from' => $m->from_name,
            'subject' => $m->subject,
            'preview' => $lastReply?->body ?? '',
            'date' => $m->created_at->format('M d, Y'),
            'unread' => $m->unread,
            'thread' => $m->replies->map(fn ($r) => [
                'from' => $r->from_name, 'body' => $r->body, 'time' => $r->created_at->format('M d, g:i A'),
            ]),
        ];
    }
}
