import { test, expect } from '@playwright/test';

// Layout, not only date text: a padded blank cell used to stretch the first week.
for(const width of [390,1440])test(`Calendar weeks stay aligned in every month at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  for(const section of [
    {tab:'Planner',suffix:'',overlay:'calendarOverlay'},
    {tab:'Reflect',suffix:'R',overlay:'calendarOverlayReflect'},
    {tab:'Journal',suffix:'J',overlay:'calendarOverlayJournal'},
  ]){
    await page.getByRole('navigation').getByRole('button',{name:section.tab,exact:true}).click();
    if(section.tab==='Journal'){
      await page.locator('#journalPinInput').fill('calendar regression passphrase');await page.locator('#confirmPassphrase').fill('calendar regression passphrase');await page.locator('#unlockJournalBtn').click();await expect(page.locator('#journalContent')).toBeVisible();
    }
    await page.locator(`#openCalendar${section.suffix}Btn`).click();
    // A full cycle covers every starting weekday and both five- and six-week layouts.
    for(let month=0;month<12;month++){
      const expected=new Date(2026,9+month,1);
      await expect(page.locator(`#calMonthLabel${section.suffix}`)).toHaveText(expected.toLocaleDateString('en-US',{month:'long',year:'numeric'}));
      const geometry=await page.locator(`#calendarDays${section.suffix}`).evaluate(el=>({
        rows:[...el.querySelectorAll('.cal-row')].map(row=>{const box=row.getBoundingClientRect();return {top:box.top,bottom:box.bottom,height:box.height};}),
        days:[...el.querySelectorAll<HTMLElement>('[data-key]')].map(day=>{const box=day.getBoundingClientRect();return {key:day.dataset.key!,x:box.x,y:box.y,width:box.width,height:box.height};}),
        blanks:[...el.querySelectorAll('.cal-day:not([data-key])')].map(day=>({padding:getComputedStyle(day).padding,height:day.getBoundingClientRect().height})),
      }));
      expect(geometry.days).toHaveLength(new Date(expected.getFullYear(),expected.getMonth()+1,0).getDate());
      const rowHeight=geometry.rows[0].height;
      for(const row of geometry.rows)expect(Math.abs(row.height-rowHeight),`${section.tab}: ${expected.toDateString()} week height`).toBeLessThan(2);
      for(let i=1;i<geometry.rows.length;i++)expect(geometry.rows[i].top-geometry.rows[i-1].bottom).toBeLessThanOrEqual(5);
      for(const blank of geometry.blanks){expect(blank.padding).toBe('0px');expect(blank.height).toBeLessThan(60);}
      const first=geometry.days[0];const offset=expected.getDay();const firstRowLeft=await page.locator(`#calendarDays${section.suffix} .cal-row`).first().evaluate(el=>el.getBoundingClientRect().left);
      expect(Math.abs(first.x-firstRowLeft-offset*(first.width+3))).toBeLessThan(2);
      for(const day of geometry.days)expect(Math.abs(day.height-first.height)).toBeLessThan(2);
      if(month===0)await page.screenshot({path:`test-results/calendar-${section.tab.toLowerCase()}-${width}.png`,fullPage:true});
      if(month<11)await page.locator(`#calNextMonth${section.suffix}`).click();
    }
    // Month navigation back to the reported month must not accumulate layout changes.
    for(let n=0;n<11;n++)await page.locator(`#calPrevMonth${section.suffix}`).click();
    await expect(page.locator(`#calMonthLabel${section.suffix}`)).toHaveText('October 2026');
    await page.locator(`#calendarDays${section.suffix} [data-key="2026-10-15"]`).click();
    await expect(page.locator(`#${section.overlay}`)).toBeHidden();
    await expect(page.locator(`#${section.suffix==='J'?'j':section.suffix==='R'?'r':''}${section.suffix?'Day':'day'}NumBig`)).toContainText('15');
  }
});
