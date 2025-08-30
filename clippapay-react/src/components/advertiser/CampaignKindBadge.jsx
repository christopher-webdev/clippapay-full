export default function CampaignKindBadge({ kind }) {
  if (!kind) return null;

  const getBadgeConfig = () => {
    switch (kind) {
      case 'ugc':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: 'UGC Campaign'
        };
      case 'pgc':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: 'PGC Campaign'
        };
      default: // 'normal'
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          label: 'Normal Campaign'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}