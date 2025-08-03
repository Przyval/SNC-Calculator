<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class InspectionImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'inspection_id',
        'url',
        'description',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function getFullUrlAttribute()
    {
        return Storage::url($this->url);
    }
}