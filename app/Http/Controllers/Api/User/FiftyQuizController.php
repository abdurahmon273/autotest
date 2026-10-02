<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Services\Quiz\FiftyQuizService;
use App\Support\Lang;
use Illuminate\Http\Request;

class FiftyQuizController extends Controller
{
    public function info(FiftyQuizService $service)
    {
        return [
            'type' => $service->type()->value,
            'label' => $service->type()->label(),
            'questions_count' => 50,
            'time_limit' => $service->timeLimitMinutes(),
            'min_incorrect_count' => $service->type()->minIncorrectCount(),
        ];
    }

    public function start(Request $request, FiftyQuizService $service)
    {
        $lang = Lang::pick($request->lang);
        $service->closeUnfinished($request->user());

        return $service->payload($service->start($request->user(), null, $lang), $lang);
    }
}
