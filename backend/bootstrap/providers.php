<?php

use App\Providers\AppServiceProvider;
use App\Providers\NotificationsServiceProvider;
use App\Providers\PlatformMailServiceProvider;

return [
    AppServiceProvider::class,
    NotificationsServiceProvider::class,
    PlatformMailServiceProvider::class,
];
