import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarHistoryComponent } from './calendar-history.component';

describe('CalendarHistoryComponent', () => {
  let component: CalendarHistoryComponent;
  let fixture: ComponentFixture<CalendarHistoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarHistoryComponent]
    });
    fixture = TestBed.createComponent(CalendarHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
