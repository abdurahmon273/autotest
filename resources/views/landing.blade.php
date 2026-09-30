<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body class="font-inter text-gray-900 bg-white antialiased">
    <header class="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div class="flex h-16 sm:h-20 w-full items-center justify-between px-[clamp(1rem,3vw,2.5rem)]">
            <a href="/" class="text-[clamp(1.25rem,2vw,1.75rem)] font-extrabold tracking-tight">{{ config('app.name') }}</a>
            <a href="{{ route('login') }}" class="rounded-lg bg-[#1e3a8a] px-[clamp(1rem,2vw,1.5rem)] py-2.5 text-[clamp(0.85rem,1vw,1rem)] font-semibold text-white transition hover:bg-[#1e40af]">Tizimga kirish</a>
        </div>
    </header>

    <main>
        <section class="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
            <div class="pointer-events-none absolute inset-0 [background-image:radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07]"></div>
            <div class="relative mx-auto w-full max-w-7xl px-[clamp(1rem,4vw,3rem)] py-[clamp(4rem,12vw,10rem)] text-center">
                <h1 class="mx-auto max-w-4xl text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight">Yangi avlod<br>ta’lim platformasi</h1>
                <p class="mx-auto mt-[clamp(1rem,2.5vw,2rem)] max-w-2xl text-[clamp(1rem,1.6vw,1.375rem)] text-gray-500">Avtomaktablar uchun zamonaviy va qulay masofaviy ta’lim tizimi</p>
                <a href="{{ route('login') }}" class="mt-[clamp(2rem,4vw,3rem)] inline-block rounded-xl bg-[#1e3a8a] px-[clamp(2rem,4vw,3rem)] py-[clamp(0.9rem,1.5vw,1.25rem)] text-[clamp(1rem,1.2vw,1.125rem)] font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-[#1e40af]">Tizimga kirish</a>
            </div>
        </section>

        <section class="bg-gray-50 py-[clamp(3rem,8vw,6rem)]">
            <div class="mx-auto grid w-full max-w-7xl grid-cols-1 gap-[clamp(1rem,2vw,1.5rem)] px-[clamp(1rem,4vw,3rem)] sm:grid-cols-2 lg:grid-cols-4">
                @foreach ([['Ustozlar va studentlar', 'Har bir foydalanuvchi uchun alohida kabinet'], ['Elektron hisob', 'Qog‘oz hujjatlarsiz'], ['Interaktiv qo‘llanmalar', 'Yo‘l harakati qoidalari'], ['Onlayn testlar', '700+ savol']] as [$t, $d])
                    <div class="rounded-2xl border border-gray-100 bg-white p-[clamp(1.5rem,3vw,2.5rem)] shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                        <p class="text-[clamp(1.1rem,1.5vw,1.375rem)] font-bold">{{ $t }}</p>
                        <p class="mt-2 text-[clamp(0.9rem,1.1vw,1rem)] text-gray-500">{{ $d }}</p>
                    </div>
                @endforeach
            </div>
        </section>

        <section class="py-[clamp(3rem,8vw,6rem)]">
            <div class="mx-auto grid w-full max-w-7xl grid-cols-2 gap-[clamp(1rem,2vw,1.5rem)] px-[clamp(1rem,4vw,3rem)] text-center lg:grid-cols-4">
                @foreach ([['Guruhlar', $stats['groups']], ['Ustozlar', $stats['teachers']], ['Studentlar', $stats['students']], ['Savollar', $stats['questions']]] as [$t, $n])
                    <div class="rounded-2xl bg-gradient-to-b from-blue-50 to-white p-[clamp(1.5rem,3vw,2.5rem)]">
                        <p class="text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-none text-[#1e3a8a]">{{ number_format($n, 0, '.', ' ') }}</p>
                        <p class="mt-[clamp(0.5rem,1vw,1rem)] text-[clamp(1rem,1.5vw,1.375rem)] font-bold">{{ $t }}</p>
                    </div>
                @endforeach
            </div>
        </section>
    </main>

    <footer class="border-t border-gray-100 py-[clamp(1.5rem,3vw,2.5rem)] text-center text-[clamp(0.8rem,1vw,0.9rem)] text-gray-400">&copy; {{ date('Y') }} {{ config('app.name') }}</footer>
</body>
</html>
