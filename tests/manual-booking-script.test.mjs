import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../scripts/ManualBooking.gs', import.meta.url),'utf8');
function harness({existing=false,mailFailure=false}={}) {
  const calls={events:0,rows:0,sms:0,mail:0};
  const sheet={getLastRow:()=>2,getRange:()=>({getDisplayValues:()=>existing?[['AB-test']]:[['other']],getValue:()=> 'event-test',setValue(){} }),appendRow(){calls.rows++;}};
  const calendar={createEvent(){calls.events++;return {getId:()=> 'event-test'};}};
  const context=vm.createContext({
    CalendarApp:{getCalendarById:()=>calendar},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},
    GmailApp:{sendEmail(){calls.mail++;if(mailFailure)throw new Error('Mail quota exhausted');}},
    getManualBookingWindow:()=>({start:new Date(Date.now()+48*3600000),end:new Date(Date.now()+49*3600000)}),
    sendManualBookingConfirmationSms(){calls.sms++;},sendManualBookingPaymentEmail(){calls.mail++;if(mailFailure)throw new Error('Invalid To header');},
    sendClientConfirmationEmail(){calls.mail++;},
    CALENDAR_ID:'test',SHEET_ID:'test',SHEET_NAME:'test',STUDIO_ADDRESS:'test',NOTIFICATION_EMAIL:'staff@example.test',FROM_EMAIL:'staff@example.test',FROM_NAME:'test',
    COL_BOOKING_REFERENCE:2,COL_CALENDAR_EVENT_ID:18,COL_SMS_CONFIRMATION_SENT:27,COL_SMS_REMINDER_24H_SENT:28,COL_SMS_REMINDER_2H_SENT:29,
  });
  vm.runInContext(source,context);
  return {calls,run:email=>context.createManualBooking({bookingReference:'AB-test',email,name:'Test',phone:'09171234567',date:'2026-10-04',time:'10:00',packageTitle:'Solo',packagePrice:499,remainingBalance:499,paymentStatus:'UNPAID'})};
}
test('Apps Script rejects invalid email before any booking or message side effects',()=>{
  const h=harness();assert.throws(()=>h.run('test@gmailcom'),/valid client email/);
  assert.deepEqual(h.calls,{events:0,rows:0,sms:0,mail:0});
});
test('notification failures return the saved event and warnings instead of failing the booking',()=>{
  const h=harness({mailFailure:true});const result=h.run('test+photos@example.test');
  assert.equal(result.ok,true);assert.equal(result.eventId,'event-test');assert.equal(result.notificationWarnings.length,2);
  assert.equal(result.staffEmailSent,false);assert.equal(result.clientEmailSent,false);assert.equal(h.calls.events,1);assert.equal(h.calls.rows,1);
});
test('retrying a saved reference reuses it without emails or texts',()=>{
  const h=harness({existing:true});const result=h.run('test@example.test');
  assert.equal(result.reused,true);assert.equal(result.notificationsSkipped,true);assert.deepEqual(h.calls,{events:0,rows:0,sms:0,mail:0});
});
test('plus-addressed email is accepted and successful notifications are reported',()=>{
  const h=harness();const result=h.run('gjp.gmb+Test1@gmail.com');
  assert.equal(result.ok,true);assert.equal(result.clientEmailSent,true);assert.equal(result.staffEmailSent,true);
});
