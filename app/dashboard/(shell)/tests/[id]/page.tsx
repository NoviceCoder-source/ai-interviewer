'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../../../lib/api';
import { useSiteSettings } from '../../../../lib/SiteSettingsContext';
import { generateTestPDF } from '../../../../lib/tests/pdf';
import type { FinishedTest, RunningTest } from '../../../../lib/tests/types';
import TestReportView from '../../../../components/tests/TestReportView';
import LoadingState from '../../../../components/LoadingState';

export default function TestResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const settings = useSiteSettings();
  const [test, setTest] = useState<FinishedTest | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ finished?: FinishedTest; running?: RunningTest }>(`/api/tests/${id}`)
      .then((d) => {
        if (d.running) router.replace(`/dashboard/test/${id}`);
        else if (d.finished) setTest(d.finished);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the report.'));
  }, [id, router]);

  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!test) return <LoadingState label="Loading report..." />;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-8">
      <div className="mx-auto max-w-[1000px]">
        <Link href="/dashboard/tests" className="mb-3 flex w-fit items-center gap-1.5 text-sm font-medium text-[#53739b] hover:opacity-80">
          <ChevronLeft size={16} /> Back to tests
        </Link>
        <TestReportView
          test={test}
          onDownload={() => generateTestPDF(test, settings.org_name).save(`test-${test.subject}-${test.level}-${test.started_at.slice(0, 10)}.pdf`)}
        />
      </div>
    </div>
  );
}
