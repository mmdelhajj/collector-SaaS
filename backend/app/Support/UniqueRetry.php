<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\UniqueConstraintViolationException;
use LogicException;

/**
 * Helper for inserts that race on a uniquely-indexed column generated from
 * an outside-the-transaction MAX() lookup. Invoice number and customer code
 * generation both follow that pattern: read max, insert max+1. Two concurrent
 * writers compute the same next number and the second insert hits a unique
 * violation. The fix is to retry — the retry runs the full callback again
 * (which re-reads max), so the second attempt sees the first writer's row
 * and computes max+2.
 */
final class UniqueRetry
{
    /**
     * @template T
     *
     * @param  callable(): T  $cb
     * @return T
     */
    public static function run(callable $cb, int $tries = 5): mixed
    {
        for ($attempt = 1; $attempt <= $tries; $attempt++) {
            try {
                return $cb();
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt >= $tries) {
                    throw $e;
                }
                // Tiny random backoff so two writers don't keep colliding in
                // lockstep. Microseconds — barely perceptible.
                usleep(random_int(1_000, 10_000));
            }
        }

        // Unreachable — the loop above always either returns or throws.
        // PHPStan requires a terminator on every path through the function.
        throw new LogicException('UniqueRetry::run reached unreachable state');
    }
}
