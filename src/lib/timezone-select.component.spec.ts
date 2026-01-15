import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TimezoneSelectComponent } from './timezone-select.component';

describe('TimezoneSelectComponent', () => {
  let component: TimezoneSelectComponent;
  let fixture: ComponentFixture<TimezoneSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TimezoneSelectComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimezoneSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with UTC offset (+00:00)', () => {
    expect(component.currentOffset()).toBe('+00:00');
  });

  it('should navigate to next offset', () => {
    const initialOffset = component.currentOffset();
    component.nextOffset();
    expect(component.currentOffset()).not.toBe(initialOffset);
  });

  it('should navigate to previous offset', () => {
    // First go to a non-first offset
    component.nextOffset();
    component.nextOffset();
    const middleOffset = component.currentOffset();

    component.previousOffset();
    expect(component.currentOffset()).not.toBe(middleOffset);
  });

  it('should loop infinitely when navigating past first offset', () => {
    // Navigate to first offset (-12:00 or similar)
    const initialOffset = component.currentOffset();
    let previousOffset = initialOffset;
    let loopCount = 0;
    const maxIterations = 50;

    // Keep going backward until we loop back
    while (loopCount < maxIterations) {
      component.previousOffset();
      const currentOffset = component.currentOffset();
      loopCount++;

      // Check if we've looped (went from a negative offset to a positive one)
      if (previousOffset.startsWith('-') && currentOffset.startsWith('+') && currentOffset !== '+00:00') {
        // We've looped from the beginning to the end
        break;
      }
      previousOffset = currentOffset;
    }

    expect(loopCount).toBeLessThan(maxIterations);
  });

  it('should loop infinitely when navigating past last offset', () => {
    // Navigate forward until we loop back to a small offset
    let loopCount = 0;
    const maxIterations = 50;
    let previousOffset = component.currentOffset();

    while (loopCount < maxIterations) {
      component.nextOffset();
      const currentOffset = component.currentOffset();
      loopCount++;

      // Check if we've looped (went from +14 back to negative)
      if (previousOffset.startsWith('+') && previousOffset > '+10:00' && currentOffset.startsWith('-')) {
        break;
      }
      previousOffset = currentOffset;
    }

    expect(loopCount).toBeLessThan(maxIterations);
  });

  it('should filter timezones by current offset', () => {
    const timezones = component.filteredTimezones();
    expect(timezones.length).toBeGreaterThan(0);
    // UTC should be in +00:00
    expect(timezones).toContain('UTC');
  });

  it('should write value and update offset', () => {
    component.writeValue('America/New_York');
    expect(component.value).toBe('America/New_York');
  });

  it('should emit valueChange on timezone change', () => {
    const spy = jasmine.createSpy('valueChange');
    component.valueChange.subscribe(spy);

    component.selectControl.setValue('Europe/Paris');
    expect(spy).toHaveBeenCalledWith('Europe/Paris');
  });

  it('should disable navigation when disabled', () => {
    component.disabled = true;
    const initialOffset = component.currentOffset();

    component.nextOffset();
    expect(component.currentOffset()).toBe(initialOffset);

    component.previousOffset();
    expect(component.currentOffset()).toBe(initialOffset);
  });

  it('should clear selection when navigating to offset that does not contain current value', () => {
    // Set a timezone
    component.writeValue('America/New_York');
    expect(component.value).toBe('America/New_York');

    // Navigate away from its offset
    component.nextOffset();
    component.nextOffset();
    component.nextOffset();

    // Value should be cleared if not in new offset
    const currentTimezones = component.filteredTimezones();
    if (!currentTimezones.includes('America/New_York')) {
      expect(component.value).toBeNull();
    }
  });

  describe('Browser Timezone Detection', () => {
    it('should have browserTimezone property', () => {
      expect(component.browserTimezone).toBeTruthy();
      expect(typeof component.browserTimezone).toBe('string');
    });

    it('should detect browser timezone when detectBrowserTimezone is called', () => {
      component.detectBrowserTimezone();
      expect(component.value).toBe(component.browserTimezone);
    });

    it('should not detect browser timezone when disabled', () => {
      component.disabled = true;
      const initialValue = component.value;
      component.detectBrowserTimezone();
      expect(component.value).toBe(initialValue);
    });

    it('should report isBrowserTimezone correctly', () => {
      expect(component.isBrowserTimezone()).toBeFalse();

      component.detectBrowserTimezone();
      expect(component.isBrowserTimezone()).toBeTrue();
    });
  });

  describe('ControlValueAccessor', () => {
    it('should register onChange callback', () => {
      const fn = jasmine.createSpy('onChange');
      component.registerOnChange(fn);
      component.selectControl.setValue('UTC');
      expect(fn).toHaveBeenCalledWith('UTC');
    });

    it('should register onTouched callback', () => {
      const fn = jasmine.createSpy('onTouched');
      component.registerOnTouched(fn);
      component.onContainerClick();
      expect(fn).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
      expect(component.disabled).toBeFalse();
      component.setDisabledState(true);
      expect(component.disabled).toBeTrue();
      component.setDisabledState(false);
      expect(component.disabled).toBeFalse();
    });
  });

  describe('MatFormFieldControl', () => {
    it('should have correct controlType', () => {
      expect(component.controlType).toBe('timezone-select');
    });

    it('should report empty correctly', () => {
      expect(component.empty).toBeTrue();
      component.writeValue('UTC');
      expect(component.empty).toBeFalse();
    });

    it('should float label when focused or has value', () => {
      expect(component.shouldLabelFloat).toBeFalse();

      component.writeValue('UTC');
      expect(component.shouldLabelFloat).toBeTrue();
    });

    it('should set describedByIds', () => {
      component.setDescribedByIds(['id1', 'id2']);
      expect(component.describedBy).toBe('id1 id2');
    });
  });
});
