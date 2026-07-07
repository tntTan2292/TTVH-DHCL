import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { PageContainer, CardContainer } from '../components/common/Containers';

import DashboardPage from '../features/dashboard/DashboardPage';

// Placeholder components to verify routing
const PlaceholderPage = ({ title }) => (
  <PageContainer title={title}>
    <CardContainer>
      <div className="h-64 flex items-center justify-center text-[var(--color-text-muted)] border-2 border-dashed border-[var(--color-surface-200)] rounded-lg">
        {title} Content Area (Not Implemented Yet)
      </div>
    </CardContainer>
  </PageContainer>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'import',
        element: <PlaceholderPage title="Import Manager" />
      },
      {
        path: 'ranking',
        children: [
          {
            index: true,
            element: <Navigate to="bcvh" replace />
          },
          {
            path: 'bcvh',
            element: <PlaceholderPage title="BCVH Ranking" />
          },
          {
            path: 'route',
            element: <PlaceholderPage title="Route Ranking" />
          }
        ]
      },
      {
        path: 'rca',
        element: <PlaceholderPage title="Pareto RCA" />
      },
      {
        path: 'evidence',
        element: <PlaceholderPage title="Evidence List" />
      },
      {
        path: 'messages',
        element: <PlaceholderPage title="Message Center" />
      }
    ]
  }
]);

export default router;
