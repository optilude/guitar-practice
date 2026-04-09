# Original set from Beato book:

1. **Secondary Dominant to Minor**
   - **Condition:** `currentChord` is Dominant 7th. `nextChord` is Minor. The root of `nextChord` is a Perfect 4th UP (or P5 down) from the root of `currentChord`. (e.g., `A7 -> Dm7`).
   - **Roman numeral analysis**: Calculate the standard diatonic Roman numeral of the `nextChord` (e.g., `ii`), and format the current chord as its dominant: `"V7/" + nextChordNumeral` (e.g., `V7/ii`).
   - **Scales to Return:** `["Phrygian Major (Phrygian Dominant)", "Altered Dominant", "Mixolydian b6"]`

2. **Secondary Dominant to Major**
   - **Condition:** `currentChord` is Dominant 7th. `nextChord` is Major. The root of `nextChord` is a Perfect 4th UP (or P5 down) from the root of `currentChord`. (e.g., `D7 -> Gmaj7`).
   - **Roman numeral analysis**: Calculate the standard diatonic Roman numeral of the `nextChord` (e.g., `V`), and format the current chord as its dominant: `"V7/" + nextChordNumeral` (e.g., `V7/V`).
   - **Scales to Return:** `["Mixolydian", "Mixolydian #11 (Lydian Dominant)"]`

3. **Related ii Chord (Two-ing the Five)**
   - **Condition:** `currentChord` is Minor 7th (or Minor 7b5). `nextChord` is Dominant 7th. The root of `nextChord` is a Perfect 4th UP (or P5 down) from the root of `currentChord`. (e.g., `Em7 -> A7`).
   - **Roman numeral analysis**: This acts as the `ii` in a secondary `ii-V` pair. Calculate the standard diatonic Roman numeral of the presumed target chord (which is a Perfect 4th UP from `nextChord`, e.g., `Dm7` which is `ii`), and format the current chord as its ii: `"ii/" + targetNumeral` (e.g., `ii/ii`). Use `"iiø/"` if it is a m7b5.
   - **Scales to Return:** `["Dorian"]` (if Minor 7th) or `["Locrian", "Locrian Nat.2"]` (if Minor 7b5).

4. **Extended Dominant Chain (Cycle of Dominants)**
   - **Condition:** `currentChord` is Dominant 7th. `nextChord` is Dominant 7th. The root of `nextChord` is a Perfect 4th UP (or P5 down) from the root of `currentChord`. (e.g., `B7 -> E7`).
   - **Roman numeral analysis**: Calculate the standard diatonic Roman numeral of the `nextChord`'s root (e.g., `VI`), and format the current chord as its dominant: `"V7/" + nextChordNumeral` (e.g., `V7/VI`).
   - **Scales to Return:** `["Mixolydian #11 (Lydian Dominant)"]`

5. **Tritone Substitution**
   - **Condition:** `currentChord` is Dominant 7th. The root of `nextChord` is a minor 2nd DOWN from the root of `currentChord`. (e.g., `Db7 -> Cmaj7`).
   - **Roman numeral analysis**: Calculate the standard diatonic Roman numeral of the `nextChord` (e.g., `I`), and format the current chord as its tritone substitute dominant: `"subV7/" + nextChordNumeral` (e.g., `subV7/I`).
   - **Scales to Return:** `["Mixolydian #11 (Lydian Dominant)"]`

6. **Diminished Passing Chord**
   - **Condition:** `currentChord` is a Diminished 7th. The root of `nextChord` is a minor 2nd UP from the root of `currentChord`. (e.g., `C#dim7 -> Dm7`).
   - **Roman numeral analysis**: Calculate the standard diatonic Roman numeral of the `nextChord` (e.g., `ii`), and format the current chord as its leading-tone diminished chord: `"vii°7/" + nextChordNumeral` (e.g., `vii°7/ii`).
   - **Scales to Return:** `["Symmetrical Diminished (Whole-Half)"]`

7. **Deceptive Resolution to Minor**
   - **Condition:** `currentChord` is Dominant 7th. `nextChord` is Minor. The root of `nextChord` is a Major 2nd UP from the root of `currentChord`. (e.g., standard `G7 -> Am7`, `V7 -> vi`). A typical deceptive cadence.
   - **Roman numeral analysis**: Calculate the standard diatonic Roman numeral of `currentChord` in the parent key (typically `V7`) but be explicitly aware that its target is minor.
   - **Scales to Return:** `["Mixolydian b6", "Altered Dominant", "Mixolydian"]` *(Idiomatic jazz favors tension scales when leading to minor targets, even deceptively).*

# Investigation by Claude:

## Core cadential devices

**ii⁷ – V⁷ – I△** *(ii–V–I, major)*
- **Context:** Universal cadence arriving at a major chord
- **Effect:** Strongest tonal resolution in jazz; ii prepares dominant tension, V resolves it. The engine of almost all jazz harmony.

**iiø⁷ – V⁷♭9 – i△/i⁷** *(ii–V–i, minor)*
- **Context:** Cadence into a minor tonic; V often carries ♭9 or ♭13
- **Effect:** Darker, unresolved feeling even at the tonic. Half-diminished ii preserves melodic minor color.

**I – VI⁷ – ii⁷ – V⁷** *(Turnaround)*
- **Context:** Final 2 bars of a chorus, cycling back to the top
- **Effect:** Keeps motion going; VI⁷ is a secondary dominant that tonicises ii, creating a chain back to V–I.

**V⁷ – VI (or ♭VI△)** *(Deceptive cadence)*
- **Context:** Where I is expected; common at phrase endings in ballads
- **Effect:** Withholds resolution, extends emotional tension; ♭VI△ version (borrowed) especially lush.

**IV△ – I△** *(Plagal cadence)*
- **Context:** Phrase endings, gospel-influenced jazz, codas
- **Effect:** Warmer, more final-sounding than V–I; lacks leading-tone urgency. Often follows an authentic cadence.

---

## Secondary dominants & dominant chains

**V⁷/ii – ii⁷, V⁷/iii – iii⁷, V⁷/IV – IV△, etc.** *(Secondary dominant)*
- **Context:** Before any diatonic chord except i/I; extremely common in bebop and standards
- **Effect:** Temporarily tonicises the target chord, adding chromatic motion and forward momentum without leaving the key.

**V⁷/V – V⁷ – I** *(Double dominant)*
- **Context:** Extended approach to tonic; common in swing era endings
- **Effect:** Amplifies the V–I resolution; adds an extra step of chromatic anticipation.

**III⁷ – VI⁷ – II⁷ – V⁷** *(Rhythm changes bridge)*
- **Context:** Bridge of Gershwin/Rhythm changes tunes (*I Got Rhythm*)
- **Effect:** A chain of dominant 7ths each a 4th apart; each chord is V⁷ of the next. Relentless momentum.

**I△ – ♭III△ – ♭VI△ – ♭II⁷ – I△** *(Tadd Dameron turnaround)*
- **Context:** Substitution for a plain turnaround; used in post-bop ballads
- **Effect:** Roots descend by major 3rds; smooth voice-leading, very colorful. ♭II⁷ functions as a tritone sub of V.

---

## Tritone & chromatic substitutions

**♭II⁷ replaces V⁷** *(Tritone substitution)*
- **Context:** Any ii–V–I; the ♭II⁷ can replace V⁷ or appear as ii–♭II⁷–I
- **Effect:** The sub shares the tritone (3rd & 7th) with the original V⁷. Bass moves by semitone into I — smooth, modern sound.

**ii⁷ – ♭II⁷ – I△** *(Tritone sub ii–V–I)*
- **Context:** Condensed cadence where V⁷ is replaced entirely
- **Effect:** Chromatic bass line (2̂–♭2̂–1̂); very common in bebop comping and reharmonisation.

**♭VII⁷ – I△** *(Backdoor dominant)*
- **Context:** Replaces V⁷–I; common in blues, funk, and post-bop
- **Effect:** Approaches tonic from a whole step above. Borrowed from parallel mixolydian; warmer and bluesier than V–I.

**Chromatic chord – target** *(Chromatic approach chord)*
- **Context:** Any chord preceded by a dominant or diminished chord a semitone away
- **Effect:** Maximises voice-leading tension; the approach chord has no diatonic function — pure motion.

---

## Diminished & borrowed devices

**I△ – ♯I°⁷ – ii⁷ / IV△ – ♯IV°⁷ – I/V** *(Passing diminished)*
- **Context:** Between any two chords a whole step apart; extremely common in stride, swing, and standards
- **Effect:** Fills the chromatic gap; the °7 acts as a rootless secondary dominant (e.g. ♯I°7 = V⁷♭9/ii without root).

**♭VII△ or iv⁷ → I△** *(Modal interchange / borrowed chord)*
- **Context:** Borrowing from parallel minor or dorian into a major context
- **Effect:** Sudden color shift; iv⁷ especially poignant (e.g. F-7 in C major). Common in Jobim, Bill Evans, and modern jazz.

**iv△ – I△** *(Minor IV to major I)*
- **Context:** Cadential or mid-phrase; borrowed from parallel minor
- **Effect:** Bittersweet quality; the ♭3 of the iv moves down by semitone to the 2nd or 5th of I, creating expressive chromaticism.

**°7 resolving to chord a half-step up** *(Auxiliary diminished)*
- **Context:** Decoration of a stationary tonic or non-tonic chord
- **Effect:** All four resolutions of a °7 are enharmonically equivalent, giving maximum harmonic ambiguity and flexibility.

---

## Advanced & less common devices

**IMaj7 – ♭III△ – ♭VI△ – II⁷ – ♭II⁷ – IMaj7** *(Coltrane substitution / Coltrane changes)*
- **Context:** Replacing a ii–V–I or static tonic; famously used in *Giant Steps* and *Countdown*
- **Effect:** Divides the octave into three equal major-3rd intervals. Creates rapid tonal motion through three key centres; voices move by semitone or common tone.

**I – IV⁷ – ♭VII△ – I** *(bebop blues device, bars 1–4)*
- **Context:** First four bars of a bebop blues (Parker, Powell)
- **Effect:** IV⁷ colors the subdominant with a dominant sound; ♭VII△ (borrowed) delays return to I and adds mixolydian color.

**I/5 – ♭VII/5 – ♭VI/5 (bass pedal)** *(Pedal point)*
- **Context:** Sustained or repeated bass note beneath changing harmony; common in modal and post-bop jazz
- **Effect:** Suspends harmonic rhythm; upper voices move independently creating polyharmonic tension that resolves when the bass finally moves.

**♭II△ – I△ or ♭II△ sustained** *(Neapolitan chord)*
- **Context:** Pre-dominant function or static reharmonisation; more common in classical-influenced jazz
- **Effect:** Flat second scale degree as a major chord; bright, unexpected color. Functions like a tritone sub without the dominant 7th.

**V⁷sus4 – V⁷ – I or II⁷ – I** *(Suspended dominant)*
- **Context:** Prolonging the dominant before resolution; pervasive in Herbie Hancock and post-1960s jazz
- **Effect:** Replaces the 3rd with a 4th, removing the leading tone. Ambiguous, floating quality; avoids the hard pull of a tritone-driven V⁷.

**vi⁷ substituting I△** *(Tonic substitution, relative minor)*
- **Context:** Any point where I is expected; especially in turnarounds
- **Effect:** vi shares two notes with I△; the exchange softens the tonic, keeps motion going, and can initiate a ii–V of the relative minor.

**iii⁷ substituting V⁷** *(Dominant substitution, iii for V)*
- **Context:** Soft approach to tonic; Evans, Jarrett
- **Effect:** iii shares the 3rd, 5th, and 7th of V⁷ (without the root). Ambiguous between tonic and dominant function — dreamy, unresolved color.

A few notes on how these group together:

The **tritone substitution** and the **passing diminished** are the two most frequently encountered chromatic devices in standard repertoire — once you hear them, they're everywhere. The backdoor dominant (♭VII⁷–I) is essentially a tritone sub that's been absorbed into the blues tradition and feels idiomatic rather than "substituted."

**Coltrane substitutions** stand apart because they operate on a structural level — they don't just decorate a cadence, they replace the entire tonal architecture of a phrase with a system based on major-third symmetry.

The **suspended dominant** (II⁷ or V⁷sus) deserves special mention as one of the defining sounds of post-1965 jazz piano — it avoids the tritone resolution pull entirely, which is why modal and fusion players lean on it so heavily.