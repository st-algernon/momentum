import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard-page/dashboard-page.component').then(m => m.DashboardPageComponent)
  },
  {
    path: 'goal/:goalId',
    loadComponent: () =>
      import('./pages/goal-detail-page/goal-detail-page.component').then(m => m.GoalDetailPageComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports-page/reports-page.component').then(m => m.ReportsPageComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings-page/settings-page.component').then(m => m.SettingsPageComponent)
  },
  { path: '**', redirectTo: '' }
];
