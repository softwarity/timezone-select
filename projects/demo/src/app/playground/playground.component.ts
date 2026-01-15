import { Component, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TimezoneSelectComponent } from '@softwarity/timezone-select';

@Component({
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    TimezoneSelectComponent
  ],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss'
})
export class PlaygroundComponent {
  private readonly destroyRef = inject(DestroyRef);

  protected isDarkMode = signal(document.body.classList.contains('dark-mode'));
  protected isDisabled = signal(false);
  protected showDetectButton = signal(true);

  protected timezoneControl = new FormControl<string | null>('Europe/Paris');
  protected selectedTimezone = signal<string | null>('Europe/Paris');

  constructor() {
    this.timezoneControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.selectedTimezone.set(value));
  }

  toggleColorScheme(): void {
    this.isDarkMode.update(dark => !dark);
    document.body.classList.toggle('dark-mode', this.isDarkMode());
  }

  toggleDisabled(): void {
    this.isDisabled.update(d => !d);
    if (this.isDisabled()) {
      this.timezoneControl.disable();
    } else {
      this.timezoneControl.enable();
    }
  }

  toggleDetectButton(): void {
    this.showDetectButton.update(d => !d);
  }

  resetToDefault(): void {
    this.timezoneControl.setValue('Europe/Paris');
  }

  clearValue(): void {
    this.timezoneControl.setValue(null);
  }
}
