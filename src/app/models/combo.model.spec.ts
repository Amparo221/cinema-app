import { describe, expect, it } from 'vitest';
import {
  Combo,
  SUFIJO_COMBO_PLUS,
  motivoNoCanjeCombo,
  nombreCombo,
  puntosCombo,
} from './combo.model';
import { Profile } from './profile.model';
import { ItemCarrito } from './producto-candy.model';
import {
  cantidadCombo,
  cantidadPagada,
  productoEstaEnCombo,
  totalCandyPagado,
} from './producto-candy.model';

const combo: Combo = {
  id: 1,
  nombre: 'Combo Clásico',
  descripcion: null,
  producto_1_id: 10,
  producto_2_id: 20,
  puntos: 12000,
  puntos_plus: 18000,
  activo: true,
};

const perfil: Profile = {
  id: 'usuario-1',
  email: 'user@example.com',
  nombre: 'Ana',
  apellido: 'Pérez',
  fecha_nacimiento: '1990-01-01',
  tipo_sangre: 'O+',
  color_ojos: 'marrón',
  dias_vacaciones: 14,
  puntos: 15000,
  creditos: 0,
  primera_compra: false,
  role: 'registrado',
};

const carrito: ItemCarrito[] = [
  {
    producto: {
      id: 10,
      nombre: 'Pochoclos',
      descripcion: null,
      categoria: 'pochoclos',
      precio: 5000,
      imagen: null,
      stock: 10,
    },
    cantidad: 2,
  },
  {
    producto: {
      id: 20,
      nombre: 'Coca-Cola',
      descripcion: null,
      categoria: 'bebidas',
      precio: 2500,
      imagen: null,
      stock: 10,
    },
    cantidad: 1,
  },
  {
    producto: {
      id: 30,
      nombre: 'Chocolate',
      descripcion: null,
      categoria: 'golosinas',
      precio: 1500,
      imagen: null,
      stock: 10,
    },
    cantidad: 3,
  },
];

describe('helpers de combo', () => {
  it('agrega el sufijo Plus + solo cuando corresponde', () => {
    expect(nombreCombo(combo)).toBe('Combo Clásico');
    expect(nombreCombo(combo, true)).toBe(`Combo Clásico${SUFIJO_COMBO_PLUS}`);
  });

  it('elige el costo base o el de butaca VIP', () => {
    expect(puntosCombo(combo)).toBe(12000);
    expect(puntosCombo(combo, true)).toBe(18000);
  });

  it('explica por qué no se puede canjear', () => {
    expect(motivoNoCanjeCombo(null, combo)).toContain('Iniciá sesión');
    expect(motivoNoCanjeCombo({ ...perfil, primera_compra: true }, combo)).toContain(
      'primera compra'
    );
    expect(motivoNoCanjeCombo({ ...perfil, puntos: 100 }, combo)).toContain(
      'faltan 11900'
    );
    expect(motivoNoCanjeCombo({ ...perfil, puntos: 15000 }, combo, true)).toContain(
      'faltan 3000'
    );
    expect(motivoNoCanjeCombo(perfil, combo)).toBeNull();
    expect(motivoNoCanjeCombo(perfil, { ...combo, activo: false })).toContain(
      'no está disponible'
    );
  });
});

describe('helpers de candy dentro del combo', () => {
  it('marca los productos incluidos y cuenta las unidades del combo', () => {
    expect(productoEstaEnCombo(10, combo)).toBe(true);
    expect(productoEstaEnCombo(20, combo)).toBe(true);
    expect(productoEstaEnCombo(30, combo)).toBe(false);
    expect(cantidadCombo(combo)).toBe(2);
    expect(cantidadCombo(null)).toBe(0);
  });

  it('calcula solo las unidades extra que se cobran en dinero', () => {
    expect(cantidadPagada(carrito[0], combo)).toBe(1);
    expect(cantidadPagada(carrito[1], combo)).toBe(0);
    expect(cantidadPagada(carrito[2], combo)).toBe(3);
    expect(totalCandyPagado(carrito, combo)).toBe(5000 + 0 + 4500);
  });

  it('sin combo cobra todo el carrito', () => {
    expect(totalCandyPagado(carrito, null)).toBe(10000 + 2500 + 4500);
  });
});
