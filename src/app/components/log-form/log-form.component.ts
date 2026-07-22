import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Goal } from '../../models/goal.model';
import { GoalsService, dateToISO } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-log-form',
  standalone: true,
  imports: [FormsModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './log-form.component.html',
  styleUrl: './log-form.component.css'
})
export class LogFormComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);

  readonly goal = input.required<Goal>();

  date: Date | null = new Date();
  amount: number | null = null;
  note = '';

  protected get amountStep(): number {
    return this.goal().unit === 'hours' ? 0.1 : 1;
  }

  submit(): void {
    const amount = Number(this.amount);
    if (!this.date || !amount || amount <= 0) return;

    this.goalsService.addLog(this.goal().id, dateToISO(this.date), amount, this.note);

    this.amount = null;
    this.note = '';
    this.toast.show('Progress added');
  }
}
