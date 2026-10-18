# Аудио-пакет SkyDiver

## Формат поставки

Музыка: OGG Vorbis, 44.1 kHz, stereo, 128–160 kbps. Каждый трек должен иметь бесшовный цикл и запас по пику не выше -1 dBTP.

- `assets/audio/music/menu.ogg` — 60–90 секунд.
- `assets/audio/music/clouds.ogg` — 90–120 секунд.
- `assets/audio/music/storm.ogg` — 90–120 секунд.
- `assets/audio/music/canyon.ogg` — 90–120 секунд.

Эффекты: OGG Vorbis, 44.1 kHz. Короткие звуки — mono, ветер и переходы — stereo.

- `coin.ogg`, `reward.ogg`, `click.ogg`
- `boost.ogg`, `near-miss.ogg`, `impact.ogg`, `death.ogg`
- `powerup.ogg`, `zone-transition.ogg`, `gust-left.ogg`, `gust-right.ogg`

## Промпты для музыки

Во всех запросах: **instrumental, seamless game loop, no vocals, no spoken words, no intro silence, no ending, original composition**.

### Меню

> Instrumental atmospheric electronic game music for a stylish skydiving arcade game menu. Warm analog synth pads, airy plucks, subtle organic percussion, optimistic anticipation, premium mobile game production, 88 BPM, spacious but memorable main motif, seamless loop, no vocals, no spoken words, no intro silence, no ending, original composition.

### Облачные острова

> Instrumental uplifting electronic arcade game loop for fast freefall above bright clouds. Airy synth arpeggios, elastic bass, crisp light percussion, sense of speed and freedom, energetic without aggression, 112 BPM, clear memorable motif, seamless loop, no vocals, no spoken words, no intro silence, no ending, original composition.

### Гроза

> Instrumental tense electronic arcade game loop for flying through a storm. Pulsing bass, distant thunder-like percussion, filtered synths, controlled tension, strong forward motion, premium game soundtrack, 116 BPM, compatible energy and key family with an uplifting sky theme, seamless loop, no vocals, no spoken words, no intro silence, no ending, original composition.

### Каньон

> Instrumental high-energy electronic arcade game loop for a dangerous canyon descent. Driving hybrid percussion, gritty bass, wind-swept synth lead, heroic urgency, precise rhythmic momentum, premium game soundtrack, 120 BPM, seamless loop, no vocals, no spoken words, no intro silence, no ending, original composition.

## Промпты для эффектов

- Монета: `Short premium arcade collectible chime, bright glass and soft synth layer, 0.25 seconds, clean transient, no reverb tail.`
- Награда: `Premium mobile game reward fanfare, three ascending sparkling notes with a warm final shimmer, 0.8 seconds, satisfying and elegant.`
- Ускорение: `Skydiver entering a powerful air stream, fast stereo whoosh with clean futuristic energy surge, 0.9 seconds, no explosion.`
- Опасный пролёт: `Very close high-speed flyby whoosh, sharp stereo movement, thrilling but clean, 0.45 seconds.`
- Столкновение: `Compact impact against a flying obstacle, cloth and light metal layers, punchy arcade style, 0.35 seconds, no gore.`
- Подбор усиления: `Clean futuristic power-up activation, rising shimmer and soft energy pulse, 0.7 seconds.`
- Смена зоны: `Cinematic airy transition sweep for entering a new environment, forward motion, 1.2 seconds, no musical chord.`
- Порыв ветра: `Strong turbulent wind gust passing from left to right, realistic but stylized for an arcade game, 0.8 seconds.`

## Приёмка

1. В цикле нет щелчка и заметного шва.
2. Музыка не маскирует монеты, предупреждения и столкновения.
3. Все эффекты читаются через динамик телефона на громкости 30–40%.
4. Громкость четырёх музыкальных треков воспринимается одинаково.
5. Сохраняются исходные файлы и подтверждение коммерческой лицензии.
