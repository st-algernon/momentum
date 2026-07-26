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
    path: 'achievements',
    loadComponent: () =>
      import('./pages/achievements-page/achievements-page.component').then(m => m.AchievementsPageComponent)
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
