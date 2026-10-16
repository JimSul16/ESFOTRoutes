import type { Resource } from '../../../../types';

const getResourceIcon = (type?: string) => {
  switch (type?.toUpperCase()) {
    case 'PDF':
      return {
        badge: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
        icon: '📄',
        label: 'Documento PDF'
      };
    case 'VIDEO':
      return {
        badge: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
        icon: '🎬',
        label: 'Video tutorial'
      };
    case 'LINK':
      return {
        badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
        icon: '🔗',
        label: 'Enlace web'
      };
    case 'IMAGE':
      return {
        badge: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
        icon: '🖼️',
        label: 'Infografía'
      };
    default:
      return {
        badge: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 border-surface-200 dark:border-surface-700',
        icon: '📌',
        label: 'Recurso'
      };
  }
};

const sanitizeUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '#';
};

export interface ResourceCardProps {
  resource: Resource | null | undefined;
}

const ResourceCard = ({ resource: res }: ResourceCardProps) => {
  if (!res) return null;

  const typeConfig = getResourceIcon(res.type);

  return (
    <a
      href={sanitizeUrl(res.url)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-surface-900/60 rounded-xl border border-surface-200/80 dark:border-surface-800 hover:border-brand-500/50 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 transition-all group shadow-2xs hover:shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${typeConfig.badge}`}>
          {typeConfig.icon}
        </span>
        <div className="min-w-0">
          <h5 className="font-semibold text-sm text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
            {res.title}
          </h5>
          <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
            {typeConfig.label}
          </span>
        </div>
      </div>
      <div className="shrink-0 ml-3 p-1.5 rounded-lg text-surface-400 group-hover:text-brand-600 group-hover:bg-brand-100/50 dark:group-hover:bg-brand-900/30 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
};

export default ResourceCard;
