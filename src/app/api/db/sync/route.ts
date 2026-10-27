import { NextRequest, NextResponse } from 'next/server';
import { 
  dbSaveCompany, 
  dbSaveCompanies, 
  dbDeleteCompany, 
  dbSaveCalculations, 
  dbSaveTaxReturn, 
  dbSavePayment, 
  dbSavePayments, 
  dbSaveCalendarEvent, 
  dbSaveCalendarEvents, 
  dbAddAuditLog,
  dbSaveStudies,
  getDatabaseStatus 
} from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.company) {
      await dbSaveCompany(body.company);
    }
    if (body.companies && Array.isArray(body.companies)) {
      await dbSaveCompanies(body.companies);
    }
    if (body.deleteCompanyId) {
      await dbDeleteCompany(body.deleteCompanyId);
    }
    if (body.calculations) {
      await dbSaveCalculations(body.calculations);
    }
    if (body.taxReturn) {
      await dbSaveTaxReturn(body.entityId || 'ENT-ID-001', body.taxReturn);
    }
    if (body.payment) {
      await dbSavePayment(body.payment);
    }
    if (body.payments && Array.isArray(body.payments)) {
      await dbSavePayments(body.payments);
    }
    if (body.calendarEvent) {
      await dbSaveCalendarEvent(body.calendarEvent);
    }
    if (body.calendarEvents && Array.isArray(body.calendarEvents)) {
      await dbSaveCalendarEvents(body.calendarEvents);
    }
    if (body.auditLog) {
      await dbAddAuditLog(body.auditLog);
    }
    if (body.studies && Array.isArray(body.studies)) {
      await dbSaveStudies(body.studies);
    }

    const status = await getDatabaseStatus();

    return NextResponse.json({
      success: true,
      databaseStatus: status,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'Database sync failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
