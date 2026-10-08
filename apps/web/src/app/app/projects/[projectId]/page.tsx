import Link from 'next/link';

import { Card, CardBody, CardHeader } from '@/components/ui';

export interface ProjectPageProps {
  /** Next.js 15: dynamic route params are async. */
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return (
    <Card>
      <CardHeader>Project overview</CardHeader>
      <CardBody>
        <p>Project id: {projectId}</p>
        <ul className="list-plain">
          <li>
            <Link href={`/app/projects/${projectId}/tasks`}>Tasks</Link>
          </li>
          <li>
            <Link href={`/app/projects/${projectId}/wiki`}>Wiki</Link>
          </li>
          <li>
            <Link href={`/app/projects/${projectId}/schedule`}>Schedule</Link>
          </li>
        </ul>
      </CardBody>
    </Card>
  );
}