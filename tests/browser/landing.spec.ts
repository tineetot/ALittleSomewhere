import { test, expect } from '@playwright/test';
test('Desktop diary button fits in a short default-zoom viewport',async({page})=>{
await page.setViewportSize({width:1440,height:650});await page.goto('/');
const button=page.locator('#openDiary'),bounds=await button.boundingBox(),heading=await page.locator('.welcome-intro h1').boundingBox();
expect(bounds).not.toBeNull();expect(heading).not.toBeNull();expect(bounds!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);expect(bounds!.y-(heading!.y+heading!.height)).toBeLessThanOrEqual(50);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(650);
const composition=await page.evaluate(()=>{const stage=document.querySelector('.welcome-stage')!.getBoundingClientRect(),title=document.querySelector('.welcome-intro h1')!,range=document.createRange();range.selectNodeContents(title);const titleRight=Math.max(...[...range.getClientRects()].map(rect=>rect.right)),action=document.querySelector('#openDiary')!.getBoundingClientRect(),book=document.querySelector('#diaryBook')!.getBoundingClientRect();return {center:stage.left+stage.width/2,gap:book.left-Math.max(titleRight,action.right)};});
expect(Math.abs(composition.center-720)).toBeLessThan(1);expect(composition.gap).toBeGreaterThanOrEqual(0);expect(composition.gap).toBeLessThanOrEqual(140);
expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
await page.screenshot({path:'test-results/landing-short-desktop.png'});
await expect(page.locator('#enterSpace')).toBeHidden();
await button.click();await expect(page.locator('#enterSpace')).toBeFocused();
await page.locator('#enterSpace').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
const next=await page.locator('#enterSpace').boundingBox();
expect(next).not.toBeNull();expect(Math.abs(next!.y-bounds!.y)).toBeLessThanOrEqual(1);expect(Math.abs(next!.x-bounds!.x)).toBeLessThanOrEqual(1);
});
for(const width of [390,768,1440,1680])test(`Diary entrance and saved app navigation at ${width}px`,async({page})=>{
await page.setViewportSize({width,height:900});await page.goto('/');
await expect(page.locator('#landing')).toBeVisible();await expect(page.locator('#appShell')).toBeHidden();
await expect(page.locator('.diary-inside')).toHaveAttribute('inert','');
await expect(page.getByText('Skip to my space',{exact:true})).toHaveCount(0);
await page.getByRole('button',{name:'Flutter the paper butterfly'}).click();await expect(page.locator('.scene-butterfly')).toHaveAttribute('aria-pressed','true');
await page.getByRole('button',{name:'Tug the ribbon'}).click();await expect(page.locator('.scene-ribbon')).toHaveAttribute('aria-pressed','true');
await page.mouse.move(200,250);
await page.getByRole('button',{name:'Turn over the paper note'}).click();await expect(page.locator('#paperNote')).toHaveAttribute('aria-pressed','true');
await page.getByRole('button',{name:'Turn the pressed flower'}).click();await expect(page.locator('#pressedFlower')).toHaveAttribute('aria-pressed','true');
expect(await page.locator('.welcome-mast').evaluate(el=>el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0);
await page.screenshot({path:`test-results/landing-${width}.png`});
await page.locator('#openDiary').click();await expect(page.locator('#enterSpace')).toBeFocused();await expect(page.locator('#openDiary')).toBeHidden();
expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
const centres=await page.evaluate(()=>{const book=document.getElementById('diaryBook')!.getBoundingClientRect(),desk=document.querySelector('.diary-desk')!.getBoundingClientRect();return {book:book.left+book.width/2,desk:desk.left+desk.width/2};});
expect(Math.abs(centres.book-centres.desk)).toBeLessThan(1);
if(width>=1300){const composition=await page.evaluate(()=>{const stage=document.querySelector('.welcome-stage')!.getBoundingClientRect(),title=document.querySelector('.welcome-intro h1')!,range=document.createRange();range.selectNodeContents(title);const titleRight=Math.max(...[...range.getClientRects()].map(rect=>rect.right)),action=document.querySelector('#openDiary')!.getBoundingClientRect(),book=document.querySelector('#diaryBook')!.getBoundingClientRect();return {center:stage.left+stage.width/2,gap:book.left-Math.max(titleRight,action.right)};});expect(Math.abs(composition.center-width/2)).toBeLessThan(1);expect(composition.gap).toBeGreaterThanOrEqual(0);expect(composition.gap).toBeLessThanOrEqual(140);}
await page.screenshot({path:`test-results/diary-open-${width}.png`});
await page.locator('#enterSpace').click();await expect(page.locator('#appShell')).toBeVisible();await expect(page.locator('#landing')).toBeHidden();
await page.locator('#newTaskText').fill('From my diary');await page.locator('#addTaskBtn').click();await expect(page.locator('.task-text')).toHaveText('From my diary');
await page.locator('#returnCover').click();await expect(page.locator('#landing')).toBeVisible();await page.goBack();await expect(page.locator('#appShell')).toBeVisible();await page.reload();await expect(page.locator('.task-text')).toHaveText('From my diary');
});
test('Reduced motion, keyboard entry, and offline cover entrance',async({page,context})=>{
await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
await page.locator('#openDiary').focus();await page.keyboard.press('Enter');await expect(page.locator('#enterSpace')).toBeFocused();
expect(await page.locator('#diaryCover').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
await page.locator('#enterSpace').focus();await page.keyboard.press('Enter');await expect(page.locator('#appShell')).toBeVisible();
await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();
await context.setOffline(true);await page.goto('/');await expect(page.locator('#landing')).toBeVisible();await page.locator('#openDiary').click();await page.locator('#enterSpace').click();await expect(page.locator('#newTaskText')).toBeVisible();await context.setOffline(false);
});
