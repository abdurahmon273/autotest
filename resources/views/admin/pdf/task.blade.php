<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #111827; margin: 0; }
        .head { border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
        .head h1 { margin: 0 0 4px; font-size: 20px; color: #1e3a8a; }
        .head p { margin: 0; color: #4b5563; font-size: 11px; }
        .meta { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px 14px; }
        .meta td { width: 25%; background: #f3f4f6; border-radius: 6px; padding: 8px 10px; vertical-align: top; }
        .meta .l { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin-bottom: 3px; }
        .meta .v { font-size: 13px; font-weight: bold; }
        .meta .g .v { color: #15803d; } .meta .b .v { color: #1d4ed8; } .meta .r .v { color: #b91c1c; }
        table.list { width: 100%; border-collapse: collapse; }
        table.list th { background: #1e3a8a; color: #fff; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; padding: 8px 8px; text-align: left; }
        table.list td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
        table.list tr:nth-child(even) td { background: #f9fafb; }
        .c { text-align: center; }
        .green { color: #15803d; font-weight: bold; } .red { color: #b91c1c; font-weight: bold; } .gray { color: #9ca3af; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9.5px; font-weight: bold; }
        .badge.passed { background: #dcfce7; color: #166534; } .badge.progress { background: #dbeafe; color: #1e40af; } .badge.failed { background: #fee2e2; color: #991b1b; }
        .pct { display: inline-block; min-width: 42px; padding: 2px 6px; border-radius: 6px; font-weight: bold; text-align: center; }
        .pct.ok { background: #dcfce7; color: #166534; } .pct.bad { background: #fee2e2; color: #991b1b; } .pct.none { background: #f3f4f6; color: #9ca3af; }
        .sub { color: #6b7280; font-size: 9.5px; }
        .foot { margin-top: 14px; font-size: 9px; color: #9ca3af; text-align: right; }
    </style>
</head>
<body>
    <div class="head">
        <h1>{{ $task->title }}</h1>
        <p>{{ $task->group->name }} &middot; {{ $themeTitle }} &middot; {{ $task->start_date->format('d.m.Y H:i') }} &mdash; {{ $task->end_date->format('d.m.Y H:i') }}</p>
    </div>

    <table class="meta"><tr>
        <td><span class="l">Jami natijalar</span><span class="v">{{ $rows->count() }}</span></td>
        <td class="b"><span class="l">Kutilmoqda</span><span class="v">{{ $counts[1] ?? 0 }}</span></td>
        <td class="g"><span class="l">Tasdiqlangan</span><span class="v">{{ $counts[2] ?? 0 }}</span></td>
        <td class="r"><span class="l">Rad etilgan</span><span class="v">{{ $counts[0] ?? 0 }}</span></td>
    </tr></table>

    <table class="list">
        <thead><tr>
            <th style="width:28px">#</th><th>Student</th><th class="c">To‘g‘ri</th><th class="c">Noto‘g‘ri</th><th class="c">Jami</th><th class="c">Foiz</th><th class="c">Holat</th><th class="c">Jarima</th>
        </tr></thead>
        <tbody>
        @forelse ($rows as $i => $h)
            @php $ok = $h->percentage >= $task->passing_percentage; @endphp
            <tr>
                <td class="gray">{{ $i + 1 }}</td>
                <td><strong>{{ $h->user?->name ?? '—' }}</strong>@if ($h->user?->username)<br><span class="sub">{{ '@'.$h->user->username }}</span>@endif</td>
                <td class="c green">{{ (int) $h->correct_sum }}</td>
                <td class="c red">{{ (int) $h->in_correct_sum }}</td>
                <td class="c"><strong>{{ $h->tests_count }}</strong> <span class="gray">/ {{ $task->min_test_count }}</span></td>
                <td class="c"><span class="pct {{ ! $h->tests_count ? 'none' : ($ok ? 'ok' : 'bad') }}">{{ $h->percentage }}%</span></td>
                <td class="c"><span class="badge {{ ['failed', 'progress', 'passed'][$h->status] ?? 'progress' }}">{{ \App\Models\Homework::STATUSES[$h->status] ?? '—' }}</span></td>
                <td class="c">0</td>
            </tr>
        @empty
            <tr><td colspan="8" class="c gray" style="padding:18px">Studentlar yo‘q</td></tr>
        @endforelse
        </tbody>
    </table>

    <p class="foot">Minimal test: {{ $task->min_test_count }} &middot; Minimal foiz: {{ $task->passing_percentage }}% &middot; {{ now()->format('d.m.Y H:i') }}</p>
</body>
</html>
