import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoalsService } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-goal-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './goal-modal.component.html',
  styleUrl: './goal-modal.component.css'
})
export class GoalModalComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);

  @ViewChild('dialog') private dialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('nameInput') private nameInputRef?: ElementRef<HTMLInputElement>;

  name = '';
  targetHours: number | null = null;
  deadline = '';

  open(): void {
    this.dialogRef.nativeElement.showModal();
    setTimeout(() => this.nameInputRef?.nativeElement.focus(), 50);
  }

  close(): void {
    this.dialogRef.nativeElement.close();
  }

  onBackdropClick(event: MouseEvent): void {
    const rect = this.dialogRef.nativeElement.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) this.close();
  }

  submit(): void {
    const name = this.name.trim();
    const target = Number(this.targetHours);
    if (!name || !target || target <= 0) return;

    this.goalsService.createGoal(name, target, this.deadline || null);
    this.resetForm();
    this.close();
    this.toast.show('Goal created');
  }

  private resetForm(): void {
    this.name = '';
    this.targetHours = null;
    this.deadline = '';
  }
}
