import { Badge, Card, EmptyState, Reveal, ShapeMark } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { ClientPostingItem, ClientVideoItem } from '../client-media-data';

function formatBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusTone(status: string): 'good' | 'accent' | 'warn' | 'neutral' {
  if (status === 'published') return 'good';
  if (status === 'approved' || status === 'scheduled') return 'accent';
  if (status === 'client_review') return 'warn';
  return 'neutral';
}

export function ClientMediaSection({ schedule, videos }: { schedule: ClientPostingItem[]; videos: ClientVideoItem[] }) {
  return (
    <Reveal delay={90} className="mt-8 space-y-8">
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Posting plan</p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">What is publishing next</h2>
          </div>
          {schedule.length > 0 && <span className="tnum text-[12px] text-ink-4">{schedule.length} planned</span>}
        </div>
        {schedule.length === 0 ? (
          <Card className="p-5"><p className="text-[13px] text-ink-3">Your posting plan has not been published here yet.</p></Card>
        ) : (
          <Card className="overflow-hidden">
            {schedule.map((item) => (
              <div key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
                <ShapeMark shape="circle" icon="content" label="Scheduled content" tone={statusTone(item.status)} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">{item.channel}{item.publishDate ? ` · ${formatDate(item.publishDate)}` : ' · Date being planned'}</p>
                </div>
                <Badge tone={statusTone(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Ready videos</p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">Watch the actual deliverables here</h2>
          </div>
          {videos.length > 0 && <span className="tnum text-[12px] text-ink-4">{videos.length} available</span>}
        </div>
        {videos.length === 0 ? (
          <EmptyState icon="content" title="No client-ready videos yet." hint="When KSP publishes a finished video version, the player will appear here." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                <video
                  src={video.signedUrl}
                  controls
                  preload="metadata"
                  playsInline
                  className="aspect-video w-full bg-black object-contain"
                  aria-label={`${video.deliverableName} version ${video.versionNumber}`}
                />
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink">{video.deliverableName}</p>
                      <p className="mt-1 truncate text-[11.5px] text-ink-4">V{video.versionNumber} · {video.fileName}{formatBytes(video.fileSizeBytes) ? ` · ${formatBytes(video.fileSizeBytes)}` : ''}</p>
                    </div>
                    <Badge tone="good">Ready</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="text-[11.5px] text-ink-4">Published {formatDate(video.publishedAt ?? video.createdAt)}</span>
                    <a href={video.signedUrl} download={video.fileName} className="text-[12px] font-medium text-brand hover:underline">Download video</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Reveal>
  );
}
