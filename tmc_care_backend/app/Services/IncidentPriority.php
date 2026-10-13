<?php

namespace App\Services;

/**
 * Works out an incident report's priority automatically from what the reporter
 * wrote (the incident type + the description). Nobody picks it by hand anymore,
 * so a reporter can't mark their own report "Critical" just to jump the queue.
 *
 *   Critical -> someone's life or safety is at immediate risk
 *   High     -> serious misconduct, harm, or a safety concern
 *   Medium   -> default for anything that doesn't match a rule
 *   Low      -> minor / housekeeping matters (only if nothing above matched)
 *
 * To tune it, just edit the keyword lists below. Each entry is a regex
 * fragment matched at the START of a word (so "stab" also catches "stabbed").
 */
class IncidentPriority
{
    private const CRITICAL = [
        'weapon', 'gun\b', 'guns\b', 'gunman', 'firearm', 'knife', 'knives', 'blade\b',
        'stab', 'shoot', 'bomb', 'explosi', 'hostage', 'kidnap', 'arson',
        'fire\b', 'on fire', 'rape', 'sexual (?:assault|abuse)', 'molest',
        'suicid', 'self[- ]?harm', 'kill', 'overdos', 'unconscious',
        'not breathing', 'severe bleeding',
    ];

    private const HIGH = [
        'bull(?:y|ie)', 'cyber', 'harass', 'assault', 'fight', 'brawl', 'violen',
        'threat', 'intimidat', 'blackmail', 'extort', 'stalk', 'hazing',
        'drug', 'marijuana', 'theft', 'stole', 'steal', 'robb', 'burglar',
        'injur', 'accident', 'hospital', 'ambulance', 'bleed', 'faint', 'seizure',
        'abus', 'discriminat', 'depress', 'mental health', 'panic',
    ];

    private const LOW = [
        'lost (?:and|&) found', 'lost (?:item|id|wallet|phone|umbrella|bag)',
        'noise', 'litter', 'dress code', 'uniform', 'suggestion', 'feedback',
        'cleanliness', 'maintenance', 'broken', 'leak', 'parking',
    ];

    public static function determine(?string $type, ?string $description = null): string
    {
        $text = mb_strtolower(trim(($type ?? '') . ' ' . ($description ?? '')));

        if (self::matches(self::CRITICAL, $text)) return 'Critical';
        if (self::matches(self::HIGH, $text)) return 'High';
        if (self::matches(self::LOW, $text)) return 'Low';

        return 'Medium';
    }

    private static function matches(array $words, string $text): bool
    {
        return $text !== '' && (bool) preg_match('/\b(?:' . implode('|', $words) . ')/u', $text);
    }
}
