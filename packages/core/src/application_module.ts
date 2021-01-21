/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {APP_INITIALIZER, ApplicationInitStatus} from './application_init';
import {ApplicationRef} from './application_ref';
import {APP_ID_RANDOM_PROVIDER} from './application_tokens';
import {defaultIterableDiffers, defaultKeyValueDiffers, IterableDiffers, KeyValueDiffers} from './change_detection/change_detection';
import {Console} from './console';
import {Injector, StaticProvider} from './di';
import {Inject, Optional, SkipSelf} from './di/metadata';
import {ErrorHandler} from './error_handler';
import {DEFAULT_LOCALE_ID, USD_CURRENCY_CODE} from './i18n/localization';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID} from './i18n/tokens';
import {ivyEnabled} from './ivy_switch';
import {ComponentFactoryResolver} from './linker';
import {Compiler} from './linker/compiler';
import {NgModule} from './metadata';
import {SCHEDULER} from './render3/component_ref';
import {setLocaleId} from './render3/i18n/i18n_locale_id';
import {NgZone} from './zone';

declare const $localize: {locale?: string};

export function _iterableDiffersFactory() {
  return defaultIterableDiffers;
}

export function _keyValueDiffersFactory() {
  return defaultKeyValueDiffers;
}

export function _localeFactory(locale?: string): string {
  locale = locale || getGlobalLocale();
  if (ivyEnabled) {
    setLocaleId(locale);
  }
  return locale;
}

/**
 * 从潜在的全局属性中计算出区域设置
 *
 * *闭包编译器：使用`goog.LOCALE`.
 * *启用常春藤：使用`$localize.locale`
 */
export function getGlobalLocale(): string {
  if (typeof ngI18nClosureMode !== 'undefined' && ngI18nClosureMode &&
      typeof goog !== 'undefined' && goog.LOCALE !== 'en') {
    // *默认的`goog.LOCALE`值为`en`，而Angular使用`en-US`。
    // *为了保持向后兼容性，我们使用Angular默认值
    //关闭编译器的
    return goog.LOCALE;
  } else {
    //与本地化保持同步`typeof $ localize！=='undefined'&& $ localize.locale`
    //编译时内联程序。
    //
    // *在编译时内联翻译时，表达式将被替换
    //使用字符串文字作为当前语言环境。 此表达式的其他形式不是
    //保证可以更换。
    //
    // *在运行时翻译评估期间，开发人员需要设置$ localize.locale
    //如果需要，或者仅提供自己的`LOCALE_ID`提供程序。
    return (ivyEnabled && typeof $localize !== 'undefined' && $localize.locale) ||
        DEFAULT_LOCALE_ID;
  }
}

/**
 *内置的[依赖关系注入令牌]（指南/词汇表＃di-令牌）
 *用于配置根注入器进行引导。
 */
export const APPLICATION_MODULE_PROVIDERS: StaticProvider[] = [
  {
    provide: ApplicationRef,
    useClass: ApplicationRef,
    deps: [NgZone, Console, Injector, ErrorHandler, ComponentFactoryResolver, ApplicationInitStatus]
  },
  {provide: SCHEDULER, deps: [NgZone], useFactory: zoneSchedulerFactory},
  {
    provide: ApplicationInitStatus,
    useClass: ApplicationInitStatus,
    deps: [[new Optional(), APP_INITIALIZER]]
  },
  {provide: Compiler, useClass: Compiler, deps: []},
  APP_ID_RANDOM_PROVIDER,
  {provide: IterableDiffers, useFactory: _iterableDiffersFactory, deps: []},
  {provide: KeyValueDiffers, useFactory: _keyValueDiffersFactory, deps: []},
  {
    provide: LOCALE_ID,
    useFactory: _localeFactory,
    deps: [[new Inject(LOCALE_ID), new Optional(), new SkipSelf()]]
  },
  {provide: DEFAULT_CURRENCY_CODE, useValue: USD_CURRENCY_CODE},
];

/**
 * 将工作安排在下一个可用插槽中。
 *
 *在Ivy中，这只是`requestAnimationFrame`。 出于兼容性原因引导时
 *使用`platformRef.bootstrap`，我们需要使用`NgZone.onStable`作为调度机制。
 *这将覆盖Ivy中的到NgZone.onStable的调度机制。
 *
 * @param ngZone NgZone用于订阅.
 */
export function zoneSchedulerFactory(ngZone: NgZone): (fn: () => void) => void {
  let queue: (() => void)[] = [];
  ngZone.onStable.subscribe(() => {
    while (queue.length) {
      queue.pop()!();
    }
  });
  return function(fn: () => void) {
    queue.push(fn);
  };
}

/**
 *为应用配置根注入器
 * ApplicationRef需要的@ angular / core依赖提供者
 *引导组件。
 *
 *由`BrowserModule`重新导出，该文件自动包含在根目录中
 *使用CLI`new`命令创建新应用程序时，`AppModule`。
 *
 * @publicApi
 */
@NgModule({providers: APPLICATION_MODULE_PROVIDERS})
export class ApplicationModule {
  // Inject ApplicationRef to make it eager...
  constructor(appRef: ApplicationRef) {}
}
