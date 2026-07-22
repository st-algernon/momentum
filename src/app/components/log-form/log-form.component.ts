import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoalsService, todayISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-log-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './log-form.component.html',
  styleUrl: './log-form.component.css'
})
export class LogFormComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);

  date = todayISO();
  hours: number | null = null;
  note = '';

  submit(): void {
    const goal = this.goalsService.activeGoal();
    if (!goal) return;

    const hours = Number(this.hours);
    if (!this.date || !hours || hours <= 0) return;

    this.goalsService.addLog(goal.id, this.date, hours, this.note);

    this.hours = null;
    this.note = '';
    this.toast.show('Progress added');
  }
}
