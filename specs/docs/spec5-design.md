# Spec 5 Design: Ambient Engine — Convert Tailwind to Inline Styles

## Component: `src/tools/AmbientEngine/AmbientEngine.tsx`

## Tailwind → Inline Style Mapping (common patterns)
```
className="flex"              → style={{ display: 'flex' }}
className="flex-col"          → style={{ flexDirection: 'column' }}
className="items-center"      → style={{ alignItems: 'center' }}
className="justify-between"   → style={{ justifyContent: 'space-between' }}
className="gap-4"             → style={{ gap: 16 }}
className="p-4"               → style={{ padding: 16 }}
className="text-sm"           → style={{ fontSize: 14 }}
className="text-gray-400"     → style={{ color: '#9ca3af' }}
className="bg-gray-900"       → style={{ background: '#111827' }}
className="rounded-lg"        → style={{ borderRadius: 8 }}
className="border border-gray-700" → style={{ border: '1px solid #374151' }}
className="w-full"            → style={{ width: '100%' }}
className="h-full"            → style={{ height: '100%' }}
```

## Now-Playing Indicator
```tsx
const ROMAN = ['I','II','III','IV','V','VI','VII']

// In the Markov step callback, update:
const [currentDegree, setCurrentDegree] = useState(0)

// Render:
<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a855f7', fontSize: 13 }}>
  <span style={{ color: '#666' }}>Now playing:</span>
  <span style={{ fontWeight: 700, fontSize: 16 }}>{ROMAN[currentDegree]}</span>
</div>
```

## Scale Degree Strip
```tsx
const [recentDegrees, setRecentDegrees] = useState<number[]>([])

// On each Markov step, prepend to recentDegrees (keep last 7)
// Render:
<div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
  {ROMAN.map((r, i) => {
    const recency = recentDegrees.indexOf(i)
    const opacity = recency === 0 ? 1 : recency === 1 ? 0.6 : recency === 2 ? 0.3 : 0.1
    const isActive = currentDegree === i
    return (
      <div key={i} style={{
        width: 32, height: 32, borderRadius: 4,
        background: isActive ? '#a855f7' : '#1e1e2e',
        border: `1px solid ${isActive ? '#a855f7' : '#333'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isActive ? '#fff' : `rgba(168,85,247,${opacity})`,
        fontSize: 11, fontWeight: 600,
        transition: 'all 0.3s ease'
      }}>
        {r}
      </div>
    )
  })}
</div>
```
