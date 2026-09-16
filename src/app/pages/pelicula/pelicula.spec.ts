import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pelicula } from './pelicula';

describe('Pelicula', () => {
  let component: Pelicula;
  let fixture: ComponentFixture<Pelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(Pelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
