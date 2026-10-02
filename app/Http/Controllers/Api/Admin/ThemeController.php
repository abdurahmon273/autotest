<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Theme;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Support\Lang;
use Illuminate\Validation\Rule;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ThemeController extends ApiController
{
    private const MIMES = 'mimes:jpg,jpeg,png,gif,webp,bmp,svg';

    public function index(Request $request)
    {
        $this->can('access_theme');

        return Theme::withInactive()->withCount('questions')
            ->when($request->filled('status'), fn ($q) => $q->where('status', (int) $request->status))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('title', 'like', "%{$s}%")->orWhere('title_krill', 'like', "%{$s}%")))
            ->ordered()
            ->paginate(15);
    }

    /** Qo'lda tartiblash: berilgan id lar ketma-ketligi bo'yicha order_id qayta taqsimlanadi (faqat shu id lar orasida). */
    public function reorder(Request $request)
    {
        $this->can('update_theme');
        $ids = $request->validate(['ids' => ['required', 'array', 'min:2'], 'ids.*' => ['integer', 'distinct']])['ids'];

        DB::transaction(function () use ($ids) {
            $slots = Theme::withInactive()->whereIn('id', $ids)->orderBy('order_id')->orderBy('id')->pluck('order_id')->values();
            abort_if($slots->count() !== count($ids), 422, 'Mavzular topilmadi.');
            foreach ($ids as $i => $id) {
                Theme::withInactive()->whereKey($id)->update(['order_id' => $slots[$i]]);
            }
        });
        Cache::flush();

        return $this->ok('Tartib saqlandi.');
    }

    public function languages()
    {
        return Lang::all();
    }

    public function search(Request $request)
    {
        return Theme::select('id', 'title', 'icon')
            ->whereNotIn('id', (array) $request->input('exclude', []))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('themes.title', 'like', "%{$s}%")->orWhere('title_krill', 'like', "%{$s}%")))
            ->ordered()
            ->limit(10)
            ->get();
    }

    public function store(Request $request)
    {
        $this->can('create_theme');
        $data = $this->validated($request);
        $theme = Theme::create(['title' => ($data['title'] ?? null) ?: null, 'title_krill' => ($data['title_krill'] ?? null) ?: null, 'icon_type' => $data['icon_type'], 'icon' => $this->icon($request, $data), 'order_id' => (int) Theme::withInactive()->max('order_id') + 1]);

        return $this->ok('Saqlandi.', ['id' => $theme->id]);
    }

    public function show(int $theme)
    {
        $this->can('update_theme');
        $theme = Theme::withInactive()->findOrFail($theme);

        return $theme->only('id', 'title', 'title_krill', 'icon_type', 'icon', 'icon_url', 'status');
    }

    /** Faol / yashirin holatni almashtirish. Yashirin mavzu hech qayerda ishlatilmaydi. */
    public function toggle(int $theme)
    {
        $this->can('update_theme');
        $theme = Theme::withInactive()->findOrFail($theme);
        $theme->update(['status' => $theme->status ? Theme::STATUS_HIDDEN : Theme::STATUS_ACTIVE]);
        \Illuminate\Support\Facades\Cache::flush();

        return $this->ok($theme->status ? 'Mavzu faollashtirildi.' : 'Mavzu yashirildi.', ['status' => $theme->status]);
    }

    public function update(Request $request, int $theme)
    {
        $this->can('update_theme');
        $theme = Theme::withInactive()->findOrFail($theme);
        $data = $this->validated($request, $theme);
        $update = ['title' => ($data['title'] ?? null) ?: null, 'title_krill' => ($data['title_krill'] ?? null) ?: null, 'icon_type' => $data['icon_type']];
        $typeChanged = (int) $data['icon_type'] !== $theme->icon_type;

        if ((int) $data['icon_type'] === Theme::ICON_TEXT) {
            if ($theme->icon_type === Theme::ICON_IMAGE && $theme->icon) {
                Storage::disk('public')->delete($theme->icon);
            }
            $update['icon'] = ($data['icon_text'] ?? null) ?: null;
        } elseif ($request->hasFile('icon') || $request->boolean('remove_icon') || $typeChanged) {
            if ($theme->icon_type === Theme::ICON_IMAGE && $theme->icon) {
                Storage::disk('public')->delete($theme->icon);
            }
            $update['icon'] = $this->storeIcon($request);
        }
        $theme->update($update);

        return $this->ok('Saqlandi.');
    }

    public function destroy(int $theme)
    {
        $this->can('delete_theme');
        Theme::withInactive()->findOrFail($theme)->delete();

        return $this->ok('O‘chirildi.');
    }

    private function validated(Request $request, ?Theme $theme = null): array
    {
        $default = Lang::default() === 'krill' ? 'title_krill' : 'title';

        return $request->validate([
            'title' => [$default === 'title' ? 'required' : 'nullable', 'string', 'max:255', Rule::unique('themes', 'title')->ignore($theme?->id)],
            'title_krill' => [$default === 'title_krill' ? 'required' : 'nullable', 'string', 'max:255'],
            'icon_type' => ['required', Rule::in(array_keys(Theme::ICON_TYPES))],
            'icon_text' => ['nullable', 'string', 'max:16'],
            'icon' => ['nullable', 'image', self::MIMES, 'max:2048'],
        ], ['icon.mimes' => 'Rasm formati qo‘llab-quvvatlanmaydi (jpg, png, gif, webp, bmp, svg).']);
    }

    private function icon(Request $request, array $data): ?string
    {
        return (int) $data['icon_type'] === Theme::ICON_TEXT ? (($data['icon_text'] ?? null) ?: null) : $this->storeIcon($request);
    }

    private function storeIcon(Request $request): ?string
    {
        if (! $request->hasFile('icon')) {
            return null;
        }
        $path = 'settings/'.uniqid('theme_').'.webp';
        Storage::disk('public')->put($path, (string) (new ImageManager(new Driver))->read($request->file('icon')->getRealPath())->cover(96, 96)->toWebp(quality: 90));

        return $path;
    }
}
