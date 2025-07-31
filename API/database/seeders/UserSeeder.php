<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'SNC Agent',
            'email' => 'agent@snc.com',
            'password' => Hash::make('password'),
        ]);

        User::factory()->count(5)->create();
    }
}
