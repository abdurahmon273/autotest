<?php

namespace App\Enums;

enum QuizEnum: string
{
    case TWENTY = '20_TALIK';
    case FIFTY = '50_TALIK';
    case TOPIC = 'MAVZULASHTIRILGAN';

    public const MIN_INCORRECT_COUNT = [
        '20_TALIK' => 2,
        '50_TALIK' => 3,
        'MAVZULASHTIRILGAN' => 0,
    ];

    public const QUESTION_COUNT = [
        '20_TALIK' => 20,
        '50_TALIK' => 50,
    ];

    public function minIncorrectCount(): int
    {
        return self::MIN_INCORRECT_COUNT[$this->value];
    }

    public function label(): string
    {
        return match ($this) {
            self::TWENTY => '20 talik',
            self::FIFTY => '50 talik',
            self::TOPIC => 'Mavzulashtirilgan',
        };
    }
}
