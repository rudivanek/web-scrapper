import { ExternalLink } from 'lucide-react';

interface RedirectChain {
  url: string;
  finalUrl: string;
  chain: string[];
  hops: number;
  isLoop: boolean;
}

interface RedirectTrackerResultProps {
  data: RedirectChain[];
}

export function RedirectTrackerResult({ data }: RedirectTrackerResultProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-neutral-600">
        ✅ No redirects detected. All URLs load directly.
      </div>
    );
  }

  const redirectCount = data.filter(d => d.hops > 0).length;
  const loopCount = data.filter(d => d.isLoop).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-neutral-700">
          <strong>{redirectCount}</strong> redirects found
        </span>
        {loopCount > 0 && (
          <span className="text-gray-600">
            <strong>{loopCount}</strong> redirect loops detected
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Source URL</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Redirect Chain</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Hops</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Final URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {data.map((item, idx) => (
              <tr key={idx} className={item.isLoop ? 'bg-gray-50' : ''}>
                <td className="px-4 py-2 text-neutral-600 break-all max-w-xs">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 flex items-center space-x-1">
                    <span className="truncate">{item.url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {item.chain.join(' → ')}
                  {item.isLoop && <span className="ml-2 text-gray-600 font-semibold">⚠️ Loop</span>}
                </td>
                <td className="px-4 py-2 text-neutral-600">{item.hops}</td>
                <td className="px-4 py-2 text-neutral-600 break-all max-w-xs truncate">
                  {item.finalUrl}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
