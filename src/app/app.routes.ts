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
    path: 'stats',
    loadComponent: () => import('./pages/stats-page/stats-page.component').then(m => m.StatsPageComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings-page/settings-page.component').then(m => m.SettingsPageComponent)
  },
  { path: '**', redirectTo: '' }
];
