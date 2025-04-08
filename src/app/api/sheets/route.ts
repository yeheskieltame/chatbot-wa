import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { z } from 'zod';

// Initialize Google Sheets API
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Request schemas
const getDataSchema = z.object({
  sheetName: z.string(),
});

const updateOrderSchema = z.object({
  date: z.string(),
  customerName: z.string(),
  email: z.string(),
  service: z.string(),
  package: z.string().optional(),
  description: z.string().optional(),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

const updateCustomerSchema = z.object({
  customerId: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
});

export async function POST(request: Request) {
  try {
    const { operation, data } = await request.json();

    switch (operation) {
      case 'getData':
        return handleGetData(data);
      case 'updateOrder':
        return handleUpdateOrder(data);
      case 'updateCustomer':
        return handleUpdateCustomer(data);
      case 'getCustomer':
        return handleGetCustomer(data);
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sheets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetData(data: unknown) {
  const { sheetName } = getDataSchema.parse(data);
  
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });

    return NextResponse.json({ data: response.data.values });
  } catch (error) {
    console.error(`Error getting data from ${sheetName}:`, error);
    return NextResponse.json(
      { error: `Failed to get data from ${sheetName}` },
      { status: 500 }
    );
  }
}

async function handleUpdateOrder(data: unknown) {
  const { date, customerName, email, service, package: pkg, description, deadline, status } = updateOrderSchema.parse(data);

  try {
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'ORDER',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          date,
          customerName,
          email,
          service,
          pkg || 'Paket Standar',
          description || '',
          deadline || '',
          status || 'Menunggu Pembayaran'
        ]]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

async function handleUpdateCustomer(data: unknown) {
  const { customerId, name, phone, email } = updateCustomerSchema.parse(data);

  try {
    // First check if customer exists
    const customers = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Customers',
    });

    const existingCustomer = customers.data.values?.find(row => row[2] === phone);

    if (existingCustomer) {
      return NextResponse.json({
        success: true,
        message: 'Customer already exists',
        customerId: existingCustomer[0]
      });
    }

    // If new customer, add them
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Customers',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          customerId,
          name,
          phone,
          email
        ]]
      }
    });

    return NextResponse.json({ success: true, customerId });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

async function handleGetCustomer(data: { phone: string }) {
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Customers',
    });

    const customer = response.data.values?.find(row => row[2] === data.phone);

    if (!customer) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      customer: {
        id: customer[0],
        name: customer[1],
        phone: customer[2],
        email: customer[3]
      }
    });
  } catch (error) {
    console.error('Error getting customer:', error);
    return NextResponse.json(
      { error: 'Failed to get customer' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json(
    { error: 'Use POST method for Sheets API operations' },
    { status: 405 }
  );
}