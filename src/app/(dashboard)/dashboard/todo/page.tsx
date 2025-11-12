import { Metadata } from 'next';
import { TeamTodoProvider } from '@/context/TeamTodoContext';
import TeamTodoApp from '@/components/TeamTodo';

export const metadata: Metadata = {
  title: 'Team Tasks | IriSync',
  description: 'Manage team tasks and collaborate with your team members.',
};

export default function TeamTodoPage() {
  return (
    <TeamTodoProvider>
      <div className="min-h-screen bg-gray-50">
        <TeamTodoApp />
      </div>
    </TeamTodoProvider>
  );
}