
export interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviews: string;
  image: string; // Mapeia para image_url no banco se necessário
  category: string;
  prepTime: string; // No banco: prep_time
  description: string;
  isVegan?: boolean;
  isCombo?: boolean;
  isHighlighted?: boolean; // No banco: is_highlighted
  availability?: 'available' | 'low_stock' | 'out_of_stock';
  inventoryId?: string; // No banco: inventory_id
  moods?: string[]; 
  affinityTags?: string[];
}

export type InventoryCategory = 'proteinas' | 'bebidas' | 'suprimentos' | 'outros';

export interface InventoryItem {
  id: string;
  name: string;
  currentQty: number; // No banco: current_qty
  minQty: number;     // No banco: min_qty
  unit: string;
  category: InventoryCategory;
  costPrice: number;  // No banco: cost_price
}

export interface WasteRecord {
  id: string;
  inventoryId: string;
  itemName: string;
  quantity: number;
  unit: string;
  costValue: number;
  reason: string;
  date: Date;
}

export interface FinancialSnapshot {
  id?: string;
  month: number;
  year: number;
  revenue: number;
  cmv: number;
  fixedCosts: number; // No banco: fixed_costs
  netProfit: number;  // No banco: net_profit
  margin: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'order' | 'promo' | 'system';
  isRead: boolean; // No banco: is_read
  createdAt: string; // No banco: created_at
}

export interface PrinterSettings {
  tenant_slug?: string;
  printerWidth: number; // No banco: printer_width
  autoPrint: boolean;   // No banco: auto_print
  ipAddress?: string;   // No banco: ip_address
  headerText?: string;  // No banco: header_text
  footerText?: string;  // No banco: footer_text
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface BusinessHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export interface Tenant {
  name: string;
  slug: string;
  logo: string;
  whatsapp: string;
  pixKey: string;      // No banco: pix_key
  paymentLink?: string; // No banco: payment_link
  deliveryFee: number;  // No banco: delivery_fee
  themeColor: string;
  products: Product[];
  categories: Category[];
  address: string;
  instagram: string;
  cardMachineFee: number; // No banco: card_machine_fee
  isOpen?: boolean;
  operatingHours?: Record<string, BusinessHours>; // No banco: operating_hours
  holidayClosures?: string[]; // No banco: holiday_closures
}

export interface CartItem extends Product {
  quantity: number;
  extras: string[];
  doneness?: string;
  itemObservation?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'finished' | 'canceled' | 'ready_to_send';

export interface Order {
  id: string;
  orderNumber?: number;      // No banco: order_number (SERIAL)
  customerName: string;      // No banco: customer_name
  customerWhatsapp: string;  // No banco: customer_whatsapp
  items: CartItem[];         // No banco: items (JSONB)
  total: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;           // No banco: created_at
  tableNumber?: string;
  address?: string;
  observation?: string;
  couponCode?: string;
  discountApplied?: number;
  userId?: string;           // No banco: user_id
}

export interface Coupon {
  id: string;
  code: string;
  discountValue: number; // No banco: discount_value
  maxUses: number;       // No banco: max_uses
  currentUses: number;   // No banco: current_uses
  isActive: boolean;     // No banco: is_active
  userId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  address?: string;
  totalOrders: number; // No banco: total_orders
  totalSpent: number;  // No banco: total_spent
  lastOrderDate?: string; // No banco: last_order_date
  tenantSlug: string; // No banco: tenant_slug
}

export enum OrderType {
  DELIVERY = 'delivery',
  LOCAL = 'local',
  UNSET = 'unset'
}

export enum Page {
  HOME = 'home',
  DETAILS = 'details',
  CART = 'cart',
  ALERTS = 'alerts',
  FAVOURITE = 'favourite',
  PROFILE = 'profile',
  DASHBOARD = 'dashboard'
}

export interface UserInfo {
  name: string;
  whatsapp: string;
  address: string;
  reference?: string;
  tableNumber?: string;
  observation?: string;
}

export interface CustomerMetrics {
  name: string;
  whatsapp: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date;
  status: 'novo' | 'regular' | 'vip' | 'sumido';
  daysSince: number;
  userId?: string;
}

export interface DREHistoryItem {
  period: string;
  revenue: number;
  cmv: number;
  fixedCosts: number;
  netProfit: number;
  margin: number;
}
