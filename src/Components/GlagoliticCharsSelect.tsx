interface GlagoliticCharsSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const GLAGOLITIC_CHARS = [
  'Ⰰ', 'Ⰱ', 'Ⰲ', 'Ⰳ', 'Ⰴ', 'Ⰵ', 'Ⰶ', 'Ⰷ', 'Ⰸ', 'Ⰺ', 'Ⰻ', 'Ⰼ', 'Ⰽ', 'Ⰾ', 'Ⰿ',
  'Ⱀ', 'Ⱁ', 'Ⱂ', 'Ⱃ', 'Ⱄ', 'Ⱅ', 'Ⱆ', 'Ⱇ', 'Ⱈ', 'Ⱉ', 'Ⱊ', 'Ⱋ', 'Ⱌ', 'Ⱍ', 'Ⱎ',
  'Ⱏ', 'ⰟⰊ', 'Ⱐ', 'Ⱑ', 'Ⱒ', 'Ⱓ', 'Ⱔ', 'Ⱖ', 'Ⱗ', 'Ⱘ', 'Ⱙ', 'Ⱚ', 'Ⱛ'
];

export function GlagoliticCharsSelect(props: GlagoliticCharsSelectProps) {

  return (
    <select
        key="glagoliticCharsSelect"
        value={props.value}
        onChange={(e) => props.onChange((e.target.value))}
        className={props.className}
        disabled={props.disabled}
    >
        {GLAGOLITIC_CHARS.map(gc => (
            <option key={gc} value={gc}>{gc}</option>
        ))}
    </select>
  );
}
