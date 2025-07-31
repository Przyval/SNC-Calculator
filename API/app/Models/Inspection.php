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
        'risk_calculation_id',
        'date_time',
        'summary',
        'recommendation',
        'treatment',
        'status',
    ];

    /**
     * An inspection belongs to a single risk calculation record.
     */
    public function riskCalculation(): BelongsTo
    {
        return $this->belongsTo(RiskCalculation::class);
    }

    /**
     * An inspection can have many images.
     */
    public function images(): HasMany
    {
        return $this->hasMany(InspectionImage::class);
    }
}