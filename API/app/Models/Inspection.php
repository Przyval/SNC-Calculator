<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'proposal_number',
        'client_id',
        'agent_name',
        'service_type',
        'inspection_data',
        'details_data',
    ];
    protected $casts = [
        'inspection_data' => 'array',
        'details_data' => 'array',
    ];
    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}