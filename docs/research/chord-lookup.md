### The Master "Guitar-Logic" JSON

(from Gemini 3.1)

This structure integrates everything: Diatonic/Pop-Rock, the Jazz palette, and your specific Blues frameworks. It is designed to be parsed easily by an LLM or a custom application.

```json
{
  "resource_name": "Guitar Soloing Reference Map",
  "version": "1.0",
  "frameworks": {
    "diatonic_major": [
      {
        "function": "I",
        "chord_type": "Maj7",
        "primary": ["Ionian"],
        "alternatives": ["Major Pentatonic"],
        "esoteric": ["Lydian"],
        "arpeggio": "1-3-5-7"
      },
      {
        "function": "ii",
        "chord_type": "m7",
        "primary": ["Dorian"],
        "alternatives": ["Minor Pentatonic"],
        "esoteric": ["Melodic Minor"],
        "arpeggio": "1-b3-5-b7"
      },
      {
        "function": "iii",
        "chord_type": "m7",
        "primary": ["Phrygian"],
        "alternatives": ["Minor Pentatonic"],
        "esoteric": ["Phrygian Dominant"],
        "arpeggio": "1-b3-5-b7"
      },
      {
        "function": "IV",
        "chord_type": "Maj7",
        "primary": ["Lydian"],
        "alternatives": ["Major Pentatonic"],
        "esoteric": ["Lydian Augmented"],
        "arpeggio": "1-3-5-7"
      },
      {
        "function": "V",
        "chord_type": "7",
        "primary": ["Mixolydian"],
        "alternatives": ["Major Pentatonic", "Bebop Dominant"],
        "esoteric": ["Altered", "Lydian Dominant"],
        "arpeggio": "1-3-5-b7"
      },
      {
        "function": "vi",
        "chord_type": "m7",
        "primary": ["Aeolian"],
        "alternatives": ["Minor Pentatonic"],
        "esoteric": ["Dorian"],
        "arpeggio": "1-b3-5-b7"
      },
      {
        "function": "vii",
        "chord_type": "m7b5",
        "primary": ["Locrian"],
        "alternatives": ["Locrian #2"],
        "esoteric": ["None"],
        "arpeggio": "1-b3-b5-b7"
      }
    ],
    "dominant_blues": [
      {
        "chord": "I",
        "primary": ["Mixolydian", "Minor Pentatonic", "Blues"],
        "alternatives": ["Major Pentatonic", "Dorian"],
        "target_notes": ["Major 3rd"],
        "logic": "The classic 'Major vs Minor' tension."
      },
      {
        "chord": "IV",
        "primary": ["Mixolydian", "Major Pentatonic", "I Chord Minor Pentatonic"],
        "alternatives": ["Blues", "Dorian"],
        "target_notes": ["b7 of IV (b3 of I)"],
        "logic": "I-chord Minor Pentatonic aligns perfectly with IV-chord tones."
      },
      {
        "chord": "V",
        "primary": ["Mixolydian", "Major Pentatonic", "I Chord Minor Pentatonic"],
        "alternatives": ["Blues", "Altered"],
        "target_notes": ["Major 3rd of V"],
        "logic": "The 3rd of the V chord is the leading tone back to the Tonic."
      }
    ],
    "minor_blues": [
      {
        "chord": "i",
        "primary": ["Natural Minor", "Minor Pentatonic", "Blues"],
        "alternatives": ["Dorian", "Melodic Minor"],
        "arpeggio": "1-b3-5-b7",
        "logic": "Dorian adds a 'bright' jazz-blues feel (m6 sound)."
      },
      {
        "chord": "iv",
        "primary": ["Dorian", "iv Chord Minor Pentatonic", "Tonic Minor Pentatonic"],
        "alternatives": ["Blues", "Phrygian"],
        "arpeggio": "1-b3-5-b7",
        "logic": "Tonic minor pentatonic remains the 'safety net'."
      },
      {
        "chord": "V",
        "primary": ["Harmonic Minor (of tonic)", "Phrygian Dominant"],
        "alternatives": ["Altered", "Half-Whole Diminished"],
        "arpeggio": "1-3-5-b7",
        "logic": "Harmonic minor provides the essential #7 leading tone."
      }
    ],
    "jazz_esoteric_palette": [
      {
        "scale": "Lydian Dominant",
        "use_case": "Non-resolving Dominant 7th chords (bVII7)",
        "intervals": "1-2-3-#4-5-6-b7"
      },
      {
        "scale": "Altered",
        "use_case": "Dominant 7th resolving to a Tonic (V7 to I)",
        "intervals": "1-b2-#2-3-b5-#5-b7"
      },
      {
        "scale": "Locrian #2",
        "use_case": "m7b5 chords (ii in a minor ii-V-i)",
        "intervals": "1-2-b3-4-b5-b6-b7"
      }
    ]
  }
}
```

This JSON serves as a complete "brain" for any scale-picker tool you build. You've got the foundational theory, the specialized blues logic you specified, and the minor blues counterparts. 

Since you mentioned building apps, which programming language or environment are you planning to use to implement this logic? (I can help with the code implementation if you're stuck on the mapping functions!)