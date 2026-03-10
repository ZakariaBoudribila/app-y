import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyTodoComponent } from './daily-todo.component';

describe('DailyTodoComponent', () => {
  let component: DailyTodoComponent;
  let fixture: ComponentFixture<DailyTodoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DailyTodoComponent]
    });
    fixture = TestBed.createComponent(DailyTodoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
