import { TestBed } from '@angular/core/testing';
import { CompraTemporalService as CompraTemporal } from './compra-temporal';

describe('CompraTemporal', () => {
  let service: CompraTemporal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CompraTemporal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
