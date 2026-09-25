<?php

namespace App\Enums;

enum ResultQuestionStatusEnum: int
{
    case UNANSWERED = 0;
    case CORRECT = 1;
    case INCORRECT = 2;
}
