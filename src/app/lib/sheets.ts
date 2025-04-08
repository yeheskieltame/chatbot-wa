import { google } from 'googleapis';

const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

interface SheetData {
  values?: any[][];
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface Order {
  date: string;
  customerName: string;
  email: string;
  service: string;
  package?: string;
  description?: string;
  deadline?: string;
  status?: string;
}

export async function getSheetData(sheetName: string): Promise<any[][]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`Error getting data from ${sheetName}:`, error);
    throw new Error(`Failed to get data from ${sheetName}`);
  }
}

export async function getCustomer(phoneNumber: string): Promise<Customer | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Customers',
    });

    const customers = response.data.values || [];
    const customerRow = customers.find(row => row[2] === phoneNumber);

    if (!customerRow) return null;

    return {
      id: customerRow[0],
      name: customerRow[1],
      phone: customerRow[2],
      email: customerRow[3]
    };
  } catch (error) {
    console.error('Error getting customer:', error);
    throw new Error('Failed to get customer data');
  }
}

export async function updateOrder(order: Order): Promise<void> {
  try {
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'ORDER',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          order.date,
          order.customerName,
          order.email,
          order.service,
          order.package || 'Paket Standar',
          order.description || '',
          order.deadline || '',
          order.status || 'Menunggu Pembayaran'
        ]]
      }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    throw new Error('Failed to update order');
  }
}

export async function updateCustomer(customer: {
  customerId: string;
  name: string;
  phone: string;
  email: string;
}): Promise<void> {
  try {
    // First check if customer exists
    const existingCustomer = await getCustomer(customer.phone);
    if (existingCustomer) return;

    // Add new customer
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Customers',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          customer.customerId,
          customer.name,
          customer.phone,
          customer.email
        ]]
      }
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    throw new Error('Failed to update customer');
  }
}

export async function checkCustomerExists(phoneNumber: string): Promise<boolean> {
  try {
    const customer = await getCustomer(phoneNumber);
    return !!customer;
  } catch (error) {
    console.error('Error checking customer:', error);
    return false;
  }
}

// Helper function to get all orders for a customer
export async function getCustomerOrders(phoneNumber: string): Promise<any[]> {
  try {
    const [customers, orders] = await Promise.all([
      getSheetData('Customers'),
      getSheetData('ORDER')
    ]);

    const customer = customers.find(c => c[2] === phoneNumber);
    if (!customer) return [];

    const customerId = customer[0];
    return orders.filter(order => order[3] === customerId); // Assuming customer ID is in column 4
  } catch (error) {
    console.error('Error getting customer orders:', error);
    return [];
  }
}

// Helper function to get service details
export async function getServiceDetails(serviceName: string): Promise<any> {
  try {
    const services = await getSheetData('LAYANAN');
    return services.find(service => service[0].toLowerCase() === serviceName.toLowerCase());
  } catch (error) {
    console.error('Error getting service details:', error);
    return null;
  }
}