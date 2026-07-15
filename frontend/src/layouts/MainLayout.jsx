import { Outlet } from 'react-router-dom';
import { SharedLayout } from '../components/shared/SharedLayout';

export default function MainLayout() {
  return (
    <SharedLayout>
      <Outlet />
    </SharedLayout>
  );
}
