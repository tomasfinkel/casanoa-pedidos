import { useState, useCallback } from "react";
import * as XLSX from "xlsx";

const C = {bg:"#1C1612",card:"#F5F0E8",cardDark:"#EDE6D6",dark:"#1A1410",muted:"#6B6158",terracotta:"#B85C38",gold:"#C9A252",green:"#3A5A3C",border:"#2E2820",borderCard:"#DDD5C0",surface:"#242018",cream:"#F5F0E8",creamDim:"#B8AD96",red:"#C0392B"};

const BULTOS_EAN = {
  "CONYNTRA S.A.": {"8001250008503": 12, "8001250008510": 12, "8001250220011": 12, "8001250220028": 12, "8001250115058": 12, "8001250410122": 20, "8001250410412": 12, "8001250145345": 12, "8001250253033": 8, "8001250152015": 8, "8001250152039": 8, "8001250120069": 24, "8001250120076": 24, "8001250120090": 24, "8001250120106": 24, "8001250120113": 24, "8001250120120": 24, "8001250120144": 24, "8001250121707": 24, "8001250120243": 24, "8001250120342": 24, "8001250120410": 24, "8001250120731": 24, "8001250120182": 24, "8001250120052": 24, "8001250120915": 24, "8001250120939": 24, "8001250121264": 12, "8001250121318": 12, "8001250121257": 12, "8001250201010": 12, "8001250201034": 12, "8001250501073": 12, "8001250001085": 12, "8001250009999": 12, "8001250000699": 12, "8001250009852": 12, "8001250039705": 12, "8001250069139": 12, "8001250069146": 12, "8001250069160": 12, "8001250099198": 12, "8001250019769": 12, "8001250009821": 12, "8001250007759": 12, "8001250014078": 12, "8001250014115": 12, "8001250013859": 12, "8001250019745": 12, "8001250019806": 12, "8001250861764": 10, "8001250891778": 10, "8001250160126": 12, "8001250160072": 12, "8001250160416": 12, "8001250160348": 12, "8001250009760": 6, "8002210500105": 12, "8002210500204": 12, "8002210560000": 12, "8002210124202": 8, "8002210135109": 6, "8002210116566": 6, "8002210122499": 12, "8002210128439": 6, "8002210112445": 6, "8002210112704": 6, "8002210132337": 6, "8002210133174": 6, "8002210133211": 6, "8002210133198": 6, "8001876002138": 12, "8001876020019": 6, "8001876020088": 6, "8001876020026": 6, "8001876020033": 12, "8001876000998": 6, "8001876550561": 12, "8001876552442": 12, "8001876550325": 6, "8001876002152": 12, "8001876002169": 12, "8004323110028": 24, "8004323110035": 24, "8004323110042": 24, "8004323110134": 24, "8004323110141": 24, "8004323110158": 24, "8004323110325": 24, "8004323110318": 24, "8004323130378": 24, "8004323110493": 24, "8004323110707": 24, "8004323111605": 20, "8004323111643": 20, "8004323212685": 12, "8004323212708": 12, "8004323312675": 12, "8004323413402": 20, "8001876003036": 12, "8001876003012": 6, "80330370": 6, "80479130": 6, "80330318": 6, "80330349": 6, "8001876060077": 12, "8001876060008": 12, "8001876060015": 12, "8001876060060": 12, "8001876060053": 12, "3083680041713": 12, "3083680004657": 12, "3083680002929": 12, "3083680003841": 12, "3083680002561": 12, "3083680026154": 12, "3083681017656": 12, "3083680001151": 12, "3083680043144": 12, "3083681108019": 12, "3083681003437": 24, "3083681003420": 24, "7891079012208": 30, "7891079012215": 30, "7891079012444": 30, "7891079013939": 30, "7891079012895": 24, "7891079012901": 24, "7891079012918": 24, "7891079013274": 24, "7891079013922": 24, "7891079013946": 24, "7896007810017": 24, "7896007810123": 24, "7896007800001": 24, "7896007811007": 24, "7896007840007": 1, "7896007800124": 24, "7896007800056": 24, "7896007840120": 1, "7896007865130": 12, "7896007833368": 12, "7896007833214": 12, "7896007830763": 24, "7896007811304": 24, "7896007811311": 24, "7896007811403": 24, "7896007865864": 12, "7896007840861": 1, "7896007826476": 12, "8426944001071": 15, "8426944021253": 15, "8426944051502": 15, "8426944000012": 15, "8426944041503": 15, "8426944000081": 17, "8426944610808": 15, "8426944600014": 15, "4102430015305": 24, "41024348": 24, "41024355": 24, "4102430000806": 2, "4100770077120": 24, "4100770005550": 24, "4014964111524": 24, "4014964112514": 24, "4014964117663": 2, "4052197002455": 24, "4102430075095": 24, "4052197001281": 24, "8714800007191": 24, "8714800004114": 24, "8714800014182": 24, "8714800036214": 12, "8711406032602": 24, "8711406000564": 24, "8711406000496": 24, "8711406022207": 24, "8000070038769": 20, "8000070035805": 20, "8000070019911": 20, "8000070010000": 20, "8000070038158": 12, "8000070036166": 12, "8000070012141": 12, "8000070011052": 12, "8000070036321": 12, "8000070053526": 10, "8000070053465": 10, "8000070053564": 10, "8000070053571": 10, "8000070053625": 10, "8000070054271": 10, "8000070053502": 10, "7798348430018": 12, "7798348430056": 12, "7798348430063": 12, "7798348430025": 12, "7798348430032": 12, "7798348430049": 12, "7798348430308": 12, "5056701000530": 12, "5063270100905": 12, "5063270100752": 12, "5063270101353": 12, "5063270101391": 12, "5063270103524": 12, "8720608014064": 12, "8720608014231": 12, "8720608014248": 12, "3045320089332": 6, "3045320089325": 6, "3045320089318": 6, "3045320089677": 6, "3045320096101": 6, "3045320089356": 6, "3045320089301": 6, "3045320089349": 6, "3045320089363": 6, "3178530402988": 12, "3178530402995": 12, "3178530403022": 12, "0016000264601": 12, "0016000289208": 12, "0016000413146": 12, "0016000411265": 12, "0016000407619": 12, "0016000439801": 12, "0016000277076": 12, "0016000278554": 12, "0016000457249": 12, "4000539142567": 14, "8003340095905": 18, "8003340801216": 12, "8003340801674": 8, "8003340098098": 8, "8003340807751": 8, "8003340807775": 8, "8003340096230": 10, "8003340096247": 10, "7610400014649": 12, "7610400068369": 12, "7610400074155": 12, "3046920028004": 20, "3046920028363": 20, "3046920029759": 20, "3046920028370": 20, "3046920029674": 20, "7610400010016": 12, "7610400010023": 12, "7610400014038": 12, "7610400010108": 12, "7610400014571": 12, "7610400013857": 11, "7610400013864": 10, "7610400078559": 15, "8003340803449": 8, "8003340803456": 8, "3046920040150": 8, "NaN": 1, "8003340590684": 1, "4000539680625": 30, "4000539694509": 30, "8003340095400": 18, "8003340095417": 18, "4000539671289": 32, "4000539671180": 16, "4000539689772": 30, "8003340801919": 16, "4000417018007": 12, "4000417025005": 12, "4000417294005": 11, "4000417022004": 12, "4000417702005": 10, "4000417703002": 11, "4000417701008": 10, "4000417700001": 10, "4000417707000": 12, "4000417933003": 12, "4000417118301": 8, "4000417117106": 8, "0046000273426": 12, "0046000273419": 12, "0046000279183": 12, "0046000821214": 24, "0046000413594": 12, "0046000288697": 32, "8410223710280": 24, "8410223710297": 24, "8410223720012": 12, "638564700847": 12, "8410223602493": 12, "8410223607726": 12, "8410223706016": 12, "8410223705774": 6, "8410223608105": 10, "8410223605913": 10, "8410223800424": 24, "8410223800882": 24, "8410223872681": 12, "8410223872995": 16, "8410223872971": 16, "8410223905396": 16, "8410223902821": 12, "8410223873435": 12, "8410223908977": 15, "8410223908984": 15, "8410223908991": 15, "0074570610051": 8, "3415581117288": 8, "0074570274000": 8, "0074570810116": 8, "0074570174003": 8, "0074570024001": 8, "0074570950010": 8, "0074570004003": 8, "3415581187281": 8, "3415587117053": 8, "3415583003053": 8, "3415583012055": 8, "3415583011058": 8, "3415587401053": 24, "3415587403057": 24, "3415587404054": 24, "3415587405051": 24, "7790975000152": 6, "7790975000374": 4, "7790975022345": 6, "7790975194417": 6, "7790975194431": 6, "7790975204468": 6, "7790975198699": 6, "7790975198736": 6, "7790975198750": 6, "7790975198613": 3, "7790975206332": 24, "7790975198774": 6, "7790975199016": 4, "7790975199054": 4, "7790975199139": 1, "7790975198637": 6, "7790975198590": 6, "7790975206219": 24, "7790975198651": 6, "7790975206370": 24, "7790975202150": 4, "7790975198675": 6, "7790975206257": 24, "7790975200941": 6, "7790975200149": 6, "7790975201634": 6, "7790975203584": 6, "7790975202365": 6, "7790975202372": 6, "7790975202389": 6, "7790975206837": 6, "7790975001487": 6, "7790975001494": 6, "7790975195674": 6, "7790975205168": 6, "7790975196770": 6, "7790975001500": 6, "7790975017013": 6, "7790975017020": 6, "7790975017037": 6, "7790975017518": 6, "7790975017495": 6, "7790975204123": 6, "7790975202204": 1, "3185370737316": 1, "3185370000335": 1, "3185370457054": 1, "3049614152337": 1, "3049610004104": 1, "3049614003417": 1, "3245990250203": 1, "5010494560282": 1, "5010494574272": 1, "5010494985498": 1, "5901041003003": 1, "7503023842396": 1, "7503023842433": 1, "7503023844314": 1, "9418408030016": 1, "3666140034007": 1, "3185370772768": 1, "3049614236181": 1, "3049614236808": 1, "3049614229510": 1},
  "PUTRUELE HERMANOS SOCIEDAD ANONIMA AGRICOLA INDUSTRIAL Y COMERCIAL": {"8008343200059": 24, "8008343200134": 24, "8008343201049": 24, "8008343200660": 16, "8008343200486": 16, "8008343200516": 16, "8008343200851": 16, "8008343200875": 12, "8008343201193": 12, "8008343220941": 12, "8008343201179": 8, "8008343880039": 12, "8008343880664": 12, "8008343801171": 8, "8008343299671": 6, "8008343299688": 6, "8008343279963": 6, "8008440210456": 24, "8008440449108": 24, "3162330450010": 24, "071460120605": 6, "0763571869000": 12, "0763571806012": 12, "0724751009876": 12, "0714604120612": 12, "0763571868980": 12, "07635718060294": 12, "0724751009937": 6, "8008440249227": 24, "8008440222008": 24},
  "IMPORTADORA SUDAMERICANA S.R.L.": {"7798347086964": 144, "6902004095218": 1000, "7798347085653": 200, "77944498": 400, "7798347089507": 400, "7798347080344": 400, "7798322400617": 72, "7798322403342": 72, "7798322403366": 72, "7798347086155": 60, "7798347086179": 200, "7798347086162": 200, "7798347085646": 1000, "7798130950014": 48, "7798347080023": 50, "7798347080016": 50, "7798347086193": 50, "7798347086209": 50, "7798347080061": 50, "7798347080054": 50, "7798347080849": 50, "7798347080856": 50, "7798347087152": 40, "7798347087145": 40, "7798347086285": 20, "7798347081426": 36, "7798347089569": 72, "7798347089583": 36, "7798347089590": 36, "-": 96, "7798347089750": 200, "7798347085622": 48, "7798347085585": 36, "7798347085592": 36, "7798347086216": 24, "7798347086223": 24, "7798347085639": 36, "7798347085998": 36, "7798347085479": 192, "7798347085486": 192, "7798347085493": 120, "7798347085509": 120, "7798347086056": 96, "7798347086063": 96, "7798347086070": 48, "7798347086087": 250, "7798347086094": 250, "7798347086100": 250, "7798347087329": 250, "7798347087343": 250, "7798347085370": 40, "7798347085387": 40, "7798347085356": 36, "7798347085363": 24, "7798347085394": 192, "7798347085400": 192, "7798347086742": 360, "7798347086759": 240, "7798347086766": 240, "7798347086773": 120, "7798130954548": 100, "7798130954555": 100, "7798347081433": 144, "7798347081457": 144, "7798130956924": 24, "7798130950212": 300, "7798130958782": 72, "7798130954586": 96, "8435124852396": 72, "7798130950960": 96, "7798347089385": 96, "7798130953633": 96, "7798130952353": 96, "7798130950779": 96, "7798130954746": 81, "8435124850644": 96, "7798347086292": 96, "7798322403502": 96, "7798130959376": 96, "7798347089408": 81, "7798347080542": 72, "7798130954760": 81, "7798347089415": 96, "7798347089422": 96, "7798347089903": 108, "7798322400846": 108, "7798347086797": 108, "7798347086711": 108, "7798347089392": 96, "7798322400754": 96, "7798347086780": 72, "7798347087084": 96, "7798347087213": 81, "7798130951776": 200, "7798130951783": 200, "7798130954319": 200, "7798130954289": 200, "7798130958034": 144, "7798130958058": 144, "7798130958072": 144, "7798130954821": 520, "9044400841000": 24, "7798347086636": 48, "8992741970563": 288, "8992741970549": 288, "8992741903486": 288, "8992741906937": 144, "8992741906890": 108, "8992741906906": 216, "8990102000812": 288, "8990102000799": 288, "8992741907347": 108, "8992741906883": 144, "7899970400674": 48, "7899970400681": 48, "7899970400698": 48, "7899970400704": 48, "7899970404160": 72, "7899970402814": 72, "7899970402852": 72, "7899970400452": 64, "7899970401657": 68, "03416307": 432, "03402809": 288, "34000702329": 288, "03431209": 24, "03436602": 12, "03484706": 32, "03484308": 32, "03484803": 32, "03400704": 192, "03400908": 192, "03499594": 192, "03409802": 192, "03466506": 192, "03421105": 192, "7730241003654": 20, "7730241003661": 20, "7730241003647": 20, "7730241003623": 24, "7730241010294": 20, "7730241009038": 20, "7730241003708": 20, "7730241003715": 20, "7730241009106": 20, "7730241009113": 20, "8410376037883": 12, "8410376052596": 12, "8410376045017": 12, "8410376017359": 12, "8410376017342": 12, "8410376009392": 16, "8410376009415": 12, "8410376017687": 48, "8410376037685": 48, "8410376037784": 18, "8410376051148": 16, "8410376042481": 8, "8410376041002": 16, "8410376046908": 16, "8410376057898": 8, "8410376029352": 8, "8410376057430": 12, "8410376050837": 16, "8410376052572": 12, "8410376017113": 20, "8410376036862": 20, "8410376048032": 12, "8410376049114": 12, "8410376049121": 12, "8410376064483": 12, "8410376002256": 12, "8410376039207": 12, "8410376044959": 12, "8414635002728": 10, "8414635002735": 10, "8414635002742": 10, "8438001616180": 10, "8438001616395": 10, "193052044136": 8, "193052069764": 8, "193052079046": 8, "193052064875": 8, "193052066220": 8, "193052066206": 8, "193052069658": 8, "193052079053": 8, "193052063595": 24, "193052081049": 30, "193052081063": 20, "193052051158": 30, "193052051165": 24, "193052063953": 6, "193052079961": 30, "193052095183": 12, "193052021496": 12, "193052001382": 24, "193052045447": 16, "193052045706": 24, "845218022969": 12, "193052051592": 24, "193052059482": 24, "193052057341": 24, "193052070616": 24, "6940176616176": 24},
  "VAMMA S.R.L.": {"7707773834643": 12, "7707773834698": 8, "7707773834704": 12, "7707194534153": 12, "7707363368268": 12, "7707363369562": 12, "7707194530018": 12, "7707194530025": 12, "7707194530209": 12, "7707194530223": 12, "7707194530247": 12, "7707194530544": 12, "7707194530599": 12, "7707194530605": 12, "7707194530773": 12, "7707194531589": 12, "7707194531770": 12, "7707194532906": 12, "7707194533439": 12, "7707194534474": 12, "7707194535938": 12, "7707363361375": 12, "7707363361542": 12, "7707363361559": 12, "7707363363881": 12, "7707363366950": 12, "7707363368275": 12, "7707363368558": 12, "7707773836708": 12, "7707194539523": 12, "7707363361436": 12, "7707773837156": 12, "7707194535488": 12, "7707363361399": 12, "7707363365373": 12, "7707773839631": 12, "7707194538168": 12, "7707773839945": 12, "7707194536447": 12, "7707194533637": 12, "7707194538922": 12, "7707194533651": 12, "7707194538021": 12, "7707773833639": 12, "7707194532999": 12, "7707363360927": 12, "7707194535242": 12, "7707194534559": 12, "7707194533750": 12, "7707194530384": 12, "7707773839532": 12, "7707363362235": 12, "7707194530308": 12, "7707363362419": 12, "7707363364802": 12, "7707194535839": 12, "7707363363515": 12, "7707194535495": 12, "7707363362655": 12, "7707773833967": 12, "7707773839938": 12, "7707773838443": 12, "7707773839686": 12, "7707773839358": 12, "7707773839518": 12, "7707194531176": 12, "7707773834636": 12, "7707194534092": 12, "7707773839525": 12, "7707773839600": 12, "7707194537741": 12, "7707194534108": 1},
  "VILLARES SOCIEDAD ANONIMA COMERCIAL": {"9312631120240": 15, "9312631130195": 12, "9312631130188": 12, "9312631130171": 12, "9312631143188": 10, "7791351144101": 10, "7791351144125": 10, "7791351144118": 10, "7791351144095": 10, "9312631127591": 6, "9312631124873": 6, "9312631120530": 6, "9312631142846": 12, "9312631142884": 12, "9312631143560": 12, "9312631143591": 12, "9312631143607": 12, "9312631144451": 12, "9312631144833": 12, "9312631143812": 12, "9312631143829": 12, "9312631140392": 6, "9312631140408": 6, "9312631140422": 6, "9312631140453": 6, "9312631140354": 6, "9312631140446": 6, "9312631140361": 6, "9312631862324": 4, "9312631862263": 4, "9312631862294": 4, "9312631862355": 4, "9312631862379": 4, "9312631862447": 4, "9312631862454": 4, "9312631862461": 4, "9312631862416": 4},
  "PARKDESIGN AND CO SRL": {"859547004008": 6, "859547004466": 6, "858797007739": 6, "810044130560": 6, "810044130744": 6, "810044130461": 36, "810044130522": 36, "859547004503": 12, "810044131031": 12, "810044131048": 12, "810044130997": 6, "810044133868": 8, "859547004688": 5, "858797007159": 5, "858797007760": 5, "810044133943": 50, "810044137613": 6, "859547004701": 12, "859547004695": 12, "810044130164": 6, "810044130782": 6}
};
const BULTOS_COD = {"MILLAN S A": {"7483": 112, "7483x8x4": 8, "4868": 6, "8366": 12, "54257": 6, "54260": 12, "9615": 6, "8372": 12, "9773": 6, "1977": 6, "44244": 12, "23509": 4, "74926": 2, "96542": 1, "LBIB2000": 4, "LBIB5000": 2, "9160": 6, "8952": 6, "95710": 6, "7629": 6, "355384EST": 2, "CBIB2000": 4, "30963": 6, "96854": 12, "96913": 12, "31057": 12, "47132": 12, "502020": 112, "502020x8x4": 8, "89073": 6, "110326": 6, "110324": 6, "110325": 6, "890732": 4, "28442115": 6, "28442116": 6, "28442117": 6, "28442114": 1, "14768": 12, "52388": 12, "41282": 12, "29080": 3, "31683": 3, "70601": 12, "70551": 12, "70399": 12, "70338": 28, "79352": 12, "89694": 12, "89690": 12, "89692": 12, "70420": 28, "8780": 12}};
const BULTOS_NOMBRE = {
  "CABRALES SA": {"TWININGS":12,"BARILLA SPAGHETTI":25,"BARILLA SPAGHETTINI":25,"BARILLA TORTIGLIONI":12,"BARILLA PENNE":12,"BARILLA FUSILLI":12,"BARILLA LASAGNE":15,"BARILLA SPAGHETTI INTEGRAL":24}
};
const BULTOS_FIJO = {"BIMBO SALMAS":28,"NATURAL PROTEIN KIBAR SRL":100,"WAPI":24};
const WEB_PROVS = new Set(["ALIMENTOS ORIGINALES S.R.L","GREEN & CO S.R.L.","KE PRODUCTO S.R.L.","FRU-SAN S.A.S.","LOS DELL ISOLA S.R.L.","MALIEX S A","SCALA, LUIS MARTIN EUGENIO","LACTEOS LA DELFINA S.A."]);
const LINKS = {"SILOS S R L":"https://app.quotiza.com/silos-srl/lista-silos?category="};
const NOMBRES = {
  "CONYNTRA S.A.":"Conyntra","PUTRUELE HERMANOS SOCIEDAD ANONIMA AGRICOLA INDUSTRIAL Y COMERCIAL":"Putruele",
  "IMPORTADORA SUDAMERICANA S.R.L.":"Sudamericana","SILOS S R L":"Silos","VAMMA S.R.L.":"Vamma",
  "MILLAN S A":"Millan","VILLARES SOCIEDAD ANONIMA COMERCIAL":"Villares","CABRALES SA":"Cabrales",
  "PARKDESIGN AND CO SRL":"Parkdesign","BIMBO SALMAS":"Bimbo Salmas","NATURAL PROTEIN KIBAR SRL":"Kibar","WAPI":"Wapi",
};
const FRECUENCIAS = {"ALIMENTOS ORIGINALES S.R.L": 7, "ALIMENTOS ZEN SRL": 15, "ALMUERZO DESNUDO, NAKED LUNCH": 30, "ANCESTRAL S. R. L.": 0, "AVE MARIA SOCIEDAD ANONIMA": 15, "BASTONI": 15, "BATTAGLIESE, NILDA VALENTINA": 30, "BELENISKI, VICTORIA": 0, "BENLIVE": 0, "BIEN DE LA TIERRA": 7, "BIMBO SALMAS": 30, "BUTTER QUEEN": 0, "CABRALES SA": 30, "CAFE CULTOR": 30, "CARMELA TOMASSA": 15, "CAROSOMA S.R.L.": 60, "CARROZ, JORGE MAXIMILIANO": 15, "CASHOO": 15, "CON SU MA INTERNATIONAL SRL": 0, "CONYNTRA S.A.": 15, "DANKON S.R.L.": 15, "DARVITA S.A.": 0, "DIABLA": 0, "DIETETICA CIENTIFICA SOCIEDAD ANONIMA COMERCIAL INDUSTRIAL FIN INM": 30, "DIPLA DISTRIBUCION SRL": 15, "DISTRIBUIDORA KINDERPHARMA SRL": 60, "DOLCESAM": 30, "DULIKO SRL": 30, "EDAMAME PRODUCTS S.A.": 30, "EGG HONS": 15, "EL ABASCAY DE LOPEZ SECO S.A.": 15, "ES RUIZ": 0, "FERNANDEZ, NADINA PAULA": 0, "FLORES": 0, "FRANK": 30, "FROSZ GELATO FIT S.R.L.": 15, "FRU-SAN S.A.S.": 15, "FYN 5 S. R. L.": 0, "GALA GOURMET S.A.": 60, "GALLINA REAL": 7, "GESELINOS": 0, "GESON SOCIEDAD ANONIMA": 30, "GIO CHOCOLATES SRL": 0, "GOODIES SA": 15, "GREEN & CO S.R.L.": 7, "HECHT, PEDRO": 7, "IFISA SOCIEDAD ANONIMA": 30, "IL MIRTILO S.R.L.": 7, "IMI": 15, "IMPORTADORA SUDAMERICANA S.R.L.": 60, "JOLLY HYGGE": 60, "KALANI S.A.": 15, "KANAWA": 7, "KE PRODUCTO S.R.L.": 7, "KETO STYLE": 0, "KOLKEI S.R.L.": 0, "KYROS": 15, "LA AGRICOLA S A": 30, "LACTEOS LA DELFINA S.A.": 15, "LEY SECA SOCIEDAD ANONIMA": 60, "LOS ALERCES": 0, "LOS DELL ISOLA S.R.L.": 30, "LUVIK S.A.": 30, "MALIEX S A": 15, "MAMI KETO, MAMI KETO": 7, "MANCHESTER IS A LAZY PLACE A SENIOR CORPORATION S.R.L.": 30, "MARIA MAGDALENA C N S.A.S.": 60, "MARQUISSE SA": 30, "MASA MADRE": 7, "MILLAN S A": 60, "MIXME SRL": 30, "MOLENS": 15, "MUNIRA FOODS S.A.": 7, "MUU COTTAGE": 0, "NATIER": 15, "NATIVO": 15, "NATURAL PROTEIN KIBAR SRL": 60, "NATURALMENTE ALMA": 0, "NATURE FOODIE SRL": 15, "NEWAY INVEST S.R.L.": 0, "NUTRIRTE": 15, "OLIBIA": 7, "ORYZA": 30, "PANE FROZEN S.R.L.": 7, "PANIFICADORA MADRE, MADRE": 0, "PANIZZA": 0, "PARKDESIGN AND CO SRL": 15, "PASTURAS DE CAZON S.R.L.": 0, "PAZZI": 0, "PLANTAE": 60, "PLANTE, NOE": 30, "POSTA EXPRESS S.R.L.": 30, "PUTRUELE HERMANOS SOCIEDAD ANONIMA AGRICOLA INDUSTRIAL Y COMERCIAL": 30, "QUINTEROS, GONZALO EMMANUEL": 15, "R Y HL S A, R&HL": 30, "RAWVOLUCION": 0, "RAZ&CIA": 7, "RICCO": 30, "SCALA, LUIS MARTIN EUGENIO": 30, "SCN DISTRIBUCION S.A.": 0, "SEMILLANDO": 30, "SERVICHEFF S.A": 0, "SILOS S R L": 15, "SILVA, LEONARDO": 15, "SOYANA S.A.": 7, "STARBREAD S.A.": 60, "SUSU S A": 15, "TERAPEUTIKA SUPLEMENTOS S.R.L.": 15, "TIKAL": 15, "TINA & CO": 0, "VAMMA S.R.L.": 30, "VILLARES SOCIEDAD ANONIMA COMERCIAL": 15, "VILLARROEL ASCANIO, MARIANA ELENA": 7, "WAPI": 7, "YGIARTO": 7, "YUKITA": 30};

function redondear(c,b){if(!b||b<=1)return c;return Math.ceil(c/b)*b;}
function getBulto(prov,ean,cod,nombre){
  if(BULTOS_FIJO[prov])return BULTOS_FIJO[prov];
  if(BULTOS_EAN[prov]&&BULTOS_EAN[prov][String(ean).trim()])return BULTOS_EAN[prov][String(ean).trim()];
  if(BULTOS_COD[prov]&&BULTOS_COD[prov][String(cod).trim()])return BULTOS_COD[prov][String(cod).trim()];
  if(BULTOS_NOMBRE[prov]){const nu=String(nombre).toUpperCase();for(const[k,v]of Object.entries(BULTOS_NOMBRE[prov])){if(nu.includes(k))return v;}}
  return null;
}
function tieneBultoConf(prov){return!!(BULTOS_EAN[prov]||BULTOS_COD[prov]||BULTOS_NOMBRE[prov]||BULTOS_FIJO[prov]);}
function debeAparecer(prov,dias){const f=FRECUENCIAS[prov];if(f===undefined)return true;if(f===0)return false;return f<=dias;}
function frecLabel(d){return d===7?"Semanal":d===15?"Quincenal":d===30?"Mensual":d===60?"Bimestral":"";}
function nCorto(prov){return NOMBRES[prov]||prov;}

function parseStock(wb){
  const ws=wb.Sheets[wb.SheetNames[0]];
  const raw=XLSX.utils.sheet_to_json(ws,{header:1});
  let hr=-1;
  for(let i=0;i<raw.length;i++){if(raw[i]&&raw[i].some(c=>String(c).toLowerCase().includes("digo producto"))){hr=i;break;}}
  if(hr===-1)return[];
  const headers=raw[hr];
  return raw.slice(hr+1).filter(r=>r&&r[0]).map(r=>{const o={};headers.forEach((h,i)=>{o[String(h)]=r[i]??"";});return o;});
}

function parseVentas(wb){
  const ws=wb.Sheets[wb.SheetNames[0]];
  const raw=XLSX.utils.sheet_to_json(ws,{header:1});
  let hr=-1;
  for(let i=0;i<raw.length;i++){if(raw[i]&&raw[i].some(c=>String(c).toLowerCase().includes("digo"))){hr=i;break;}}
  if(hr===-1)return[];
  const headers=raw[hr];
  return raw.slice(hr+1).filter(r=>r&&r[0]).map(r=>{const o={};headers.forEach((h,i)=>{o[String(h)]=r[i]??"";});return o;});
}

function calcular(stock,ventas,diasV,soloQuiebre){
  const vm={};
  ventas.forEach(v=>{
    const keys=Object.keys(v);
    const codKey=keys.find(k=>k.toLowerCase().includes("digo"))||keys[0];
    const vendKey=keys.find(k=>k.toLowerCase().includes("vendida")||k.toLowerCase().includes("ctd"))||keys[keys.length-1];
    const cod=String(v[codKey]||"").trim();
    if(cod)vm[cod]=parseFloat(v[vendKey])||0;
  });
  return stock.map(p=>{
    const cod=String(p["Código Producto"]||p["Codigo Producto"]||"").trim();
    const ean=String(p["Código Barra"]||p["Codigo Barra"]||"").trim();
    const nombre=String(p["Producto"]||"").trim();
    const prov=String(p["Proveedor"]||"SIN PROVEEDOR").trim()||"SIN PROVEEDOR";
    const sR=parseFloat(p["Stock Real"])||0;
    const sI=parseFloat(p["Stock Ideal"])||0;
    const falt=parseFloat(p["Ctd. Faltante"]||p["Ctd Faltante"])||0;
    const esQuiebre=sR===0||falt>0;
    if(soloQuiebre){if(!esQuiebre||FRECUENCIAS[prov]===0)return null;}
    else{if(!debeAparecer(prov,diasV))return null;}
    const vend=vm[cod]||0;
    const frecProv=FRECUENCIAS[prov];
    const margen=3;
    const diasProy=(!soloQuiebre&&frecProv&&frecProv>0)?frecProv+margen:diasV+margen;
    const proy=Math.round((vend/diasV)*diasProy);
    // Cantidad a pedir = proyeccion - stock actual (ignorar ideal/minimo de DUX)
    const cant=Math.max(0,proy-sR);
    const bulto=getBulto(prov,ean,cod,nombre);
    const cantF=bulto?redondear(Math.round(cant),bulto):Math.round(cant);
    return{cod,ean,nombre,prov,sR,sI,falt,vend,proy,cant:cantF,bulto,esQuiebre};
  }).filter(p=>p&&p.cant>0&&p.nombre);
}

function agrupar(productos){
  const map={};
  productos.forEach(p=>{if(!map[p.prov])map[p.prov]=[];map[p.prov].push(p);});
  return Object.entries(map).map(([prov,items])=>({
    prov,items,nombre:nCorto(prov),
    total:items.reduce((s,i)=>s+i.cant,0),
    esLink:!!LINKS[prov],url:LINKS[prov]||null,
    esWeb:WEB_PROVS.has(prov),tieneBulto:tieneBultoConf(prov),
    frecDias:FRECUENCIAS[prov]||null,
    tieneQuiebre:items.some(i=>i.esQuiebre),
  })).sort((a,b)=>b.items.length-a.items.length);
}

function mkOrden(g,cants,numOrden){
  const fecha=new Date().toLocaleDateString("es-AR");
  const lineas=g.items.map(p=>{
    const c=cants[p.cod]!==undefined?cants[p.cod]:p.cant;
    const bi=p.bulto&&c>0?" ("+Math.round(c/p.bulto)+" bulto"+(Math.round(c/p.bulto)!==1?"s":"")+" x"+p.bulto+")":"";
    return "- "+p.nombre+": *"+c+" u.*"+bi;
  }).join("\n");
  const total=g.items.reduce((s,p)=>s+(cants[p.cod]!==undefined?cants[p.cod]:p.cant),0);
  return "*ORDEN DE COMPRA #"+numOrden+"*\n*Casa NOA* | "+fecha+"\n*Proveedor:* "+g.nombre+"\n"+"─".repeat(25)+"\n"+lineas+"\n"+"─".repeat(25)+"\n*Total: "+total+" unidades*\n\nGracias!";
}


function descargarImagenOrden(g, cants, numOrden) {
  const fecha = new Date().toLocaleDateString('es-AR');
  const items = g.items.map(p => {
    const c = cants[p.cod] !== undefined ? cants[p.cod] : p.cant;
    const bi = p.bulto && c > 0 ? ' (' + Math.round(c/p.bulto) + ' bulto' + (Math.round(c/p.bulto)!==1?'s':'') + ' x' + p.bulto + ')' : '';
    return {nombre: p.nombre, cant: c, bultoInfo: bi, sinStock: p.sR === 0};
  });
  const lineH = 30;
  const padding = 24;
  const width = 640;
  const headerH = 110;
  const footerH = 70;
  const height = headerH + (items.length * lineH) + footerH + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1A1410';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#B85C38';
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('CASA NOA', padding, 38);
  ctx.font = '11px Arial';
  ctx.fillStyle = '#E8C97A';
  ctx.fillText('ORDEN DE COMPRA #' + numOrden, padding, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '13px Arial';
  ctx.fillText('Proveedor: ' + g.nombre, padding, 80);
  ctx.fillText('Fecha: ' + fecha, padding, 98);
  items.forEach((item, i) => {
    const y = headerH + padding + (i * lineH);
    ctx.fillStyle = item.sinStock ? '#3A1510' : (i%2===0 ? '#242018' : '#1C1612');
    ctx.fillRect(0, y, width, lineH);
    ctx.fillStyle = '#2E2820';
    ctx.fillRect(0, y + lineH - 1, width, 1);
    ctx.fillStyle = item.sinStock ? '#E07070' : '#F5F0E8';
    ctx.font = item.sinStock ? 'bold 12px Arial' : '12px Arial';
    const maxN = 58;
    const nombre = item.nombre.length > maxN ? item.nombre.substring(0, maxN) + '...' : item.nombre;
    ctx.fillText(nombre, padding, y + 20);
    ctx.fillStyle = '#E8C97A';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(item.cant + ' u.' + item.bultoInfo, width - padding, y + 20);
    ctx.textAlign = 'left';
  });
  const fy = headerH + padding + (items.length * lineH);
  ctx.fillStyle = '#B85C38';
  ctx.fillRect(0, fy, width, footerH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px Arial';
  const totalU = items.reduce((s, i) => s + i.cant, 0);
  ctx.fillText('Total: ' + totalU + ' unidades (' + items.length + ' productos)', padding, fy + 30);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px Arial';
  ctx.fillText('Casa NOA - Tienda Natural', padding, fy + 52);
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OrdenCompra_' + g.nombre.replace(/[^a-zA-Z0-9]/g,'_') + '_' + numOrden + '.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function UploadZone({label,icon,onFile,loaded}){
  const handle=useCallback((file)=>{
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{onFile(XLSX.read(e.target.result,{type:"array"}));};
    r.readAsArrayBuffer(file);
  },[onFile]);
  const id="inp"+label.replace(/[^a-z]/gi,"");
  return(
    <div onClick={()=>document.getElementById(id).click()}
      style={{border:"2px dashed "+(loaded?C.green:C.border),borderRadius:16,padding:"22px 14px",textAlign:"center",cursor:"pointer",background:loaded?"#3A5A3C12":C.surface,flex:1,minWidth:140}}>
      <input id={id} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      <div style={{fontSize:28,marginBottom:6}}>{loaded?"✅":icon}</div>
      <div style={{fontSize:12,fontWeight:700,color:loaded?C.green:C.cream,marginBottom:3}}>{loaded?"Cargado!":label}</div>
      <div style={{fontSize:10,color:C.creamDim}}>{loaded?"Toca para cambiar":"Arrastra o toca"}</div>
    </div>
  );
}

function Card({g,num,onCantChange,esAlerta,pedido,onMarcarPedido,numOrden}){
  const [open,setOpen]=useState(false);
  const [cants,setCants]=useState({});
  const [copiado,setCopiado]=useState(false);
  const [numWA,setNumWA]=useState("");
  const getC=(cod,def)=>cants[cod]!==undefined?cants[cod]:def;
  const orden=mkOrden(g,cants,numOrden);

  const setCant=(cod,valor,bulto)=>{
    let n=parseInt(valor)||0;
    if(bulto&&n>0)n=redondear(n,bulto);
    const nuevas={...cants,[cod]:n};
    setCants(nuevas);
    onCantChange(g.prov,nuevas);
  };
  const copiar=()=>{navigator.clipboard.writeText(orden).then(()=>{setCopiado(true);setTimeout(()=>setCopiado(false),2000);});};
  const envWA=()=>{
    const n=numWA.replace(/[^0-9]/g,"");
    window.open((n?"https://wa.me/"+n:"https://wa.me/")+"?text="+encodeURIComponent(orden),"_blank");
  };
  const badge=g.esLink?{bg:"#2A4A8022",color:"#2A4A80",label:"Link web"}
    :g.esWeb?{bg:"#6B4C9A22",color:"#6B4C9A",label:"Web"}
    :g.tieneBulto?{bg:"#C9A25222",color:"#8B6914",label:"Por bulto"}
    :{bg:"#25D36622",color:"#128C7E",label:"WhatsApp"};

  if(pedido){
    return(
      <div style={{background:"#3A5A3C15",borderRadius:16,border:"1px solid #3A5A3C40",padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,opacity:0.7}}>
        <div style={{fontSize:16}}>✅</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.green}}>{g.nombre}</div>
          <div style={{fontSize:10,color:C.muted}}>Pedido realizado · {g.items.length} prod · {g.total} u.</div>
        </div>
        <button onClick={()=>onMarcarPedido(g.prov,false)}
          style={{border:"1px solid #3A5A3C40",background:"transparent",borderRadius:8,padding:"4px 10px",fontSize:10,color:C.green,cursor:"pointer"}}>Deshacer</button>
      </div>
    );
  }

  return(
    <div style={{background:C.card,borderRadius:16,border:"1.5px solid "+(esAlerta?"#C0392B":C.borderCard),overflow:"hidden",marginBottom:10}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:open?C.cardDark:C.card}}>
        <div style={{background:esAlerta?C.red:C.terracotta,color:"#fff",borderRadius:8,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:esAlerta?14:11,fontWeight:800,flexShrink:0}}>{esAlerta?"!":num}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.nombre}</div>
          <div style={{fontSize:10,color:esAlerta?C.red:C.muted,fontWeight:esAlerta?700:400}}>
            {esAlerta?"QUIEBRE - ":""}{g.items.filter(i=>i.sR===0).length>0&&g.items.filter(i=>i.sR===0).length+" sin stock · "}
            {g.items.length} prod · {g.total} u.{g.frecDias&&!esAlerta?" · "+frecLabel(g.frecDias):""}
          </div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
          <span style={{background:badge.bg,borderRadius:7,padding:"3px 7px",fontSize:9,fontWeight:700,color:badge.color}}>{badge.label}</span>
          <span style={{color:C.muted,fontSize:14}}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {open&&(
        <div style={{borderTop:"1px solid "+C.borderCard}}>
          {(g.esLink||g.esWeb)?(
            <div style={{padding:14}}>
              <div style={{background:g.esLink?"#E3F0FF":"#F3E8FF",borderRadius:12,padding:14,marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:700,color:g.esLink?"#2A4A80":"#6B4C9A",marginBottom:6}}>
                  {g.esLink?"Este proveedor se pide por plataforma web":"Este proveedor se pide por su web propia"}
                </div>
                {g.esLink&&<button onClick={()=>window.open(g.url,"_blank")} style={{background:"#2A4A80",color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Ir a la plataforma</button>}
              </div>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Referencia</div>
              {g.items.map(p=>(
                <div key={p.cod} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.borderCard,fontSize:11}}>
                  <span style={{color:p.sR===0?C.red:C.dark,flex:1,fontWeight:p.sR===0?700:400}}>{p.sR===0?"🔴 ":""}{p.nombre}</span>
                  <span style={{color:C.terracotta,fontWeight:700,marginLeft:8}}>{p.cant} u.</span>
                </div>
              ))}
            </div>
          ):(
            <>
              {g.tieneBulto&&<div style={{margin:"10px 12px 0",background:"#FFFDE7",border:"1px solid #C9A25240",borderRadius:10,padding:"8px 12px",fontSize:11,color:"#8B6914",fontWeight:600}}>Cantidades redondeadas al bulto. Edita y se ajustan solas.</div>}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:C.dark}}>
                      <th style={{padding:"7px 8px",color:"#fff",textAlign:"left",fontSize:10}}>Producto</th>
                      <th style={{padding:"7px 8px",color:"#fff",textAlign:"center",fontSize:10}}>Stock</th>
                      <th style={{padding:"7px 8px",color:"#fff",textAlign:"center",fontSize:10}}>Vend.</th>
                      <th style={{padding:"7px 8px",color:"#fff",textAlign:"center",fontSize:10}}>Proy.</th>
                      {g.tieneBulto&&<th style={{padding:"7px 8px",color:"#fff",textAlign:"center",fontSize:10}}>Bulto</th>}
                      <th style={{padding:"7px 8px",color:C.gold,textAlign:"center",fontSize:10}}>PEDIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((p,i)=>{
                      const c=getC(p.cod,p.cant);
                      const nb=p.bulto&&c>0?Math.round(c/p.bulto):null;
                      const rowBg=p.sR===0?"#FDECEA":i%2===0?C.card:C.cardDark;
                      return(
                        <tr key={p.cod} style={{background:rowBg}}>
                          <td style={{padding:"6px 8px",color:p.sR===0?C.red:C.dark,maxWidth:180,fontSize:11,fontWeight:p.sR===0?700:400}}>{p.sR===0?"🔴 ":""}{p.nombre}</td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:p.sR===0?C.red:C.dark,fontWeight:p.sR===0?800:400}}>{p.sR}</td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:C.muted}}>{p.vend}</td>
                          <td style={{padding:"6px 8px",textAlign:"center",color:C.muted}}>{p.proy}</td>
                          {g.tieneBulto&&<td style={{padding:"6px 8px",textAlign:"center"}}>{p.bulto?<span style={{background:"#C9A25220",color:"#8B6914",borderRadius:6,padding:"2px 6px",fontSize:10,fontWeight:700}}>{"x"+p.bulto}</span>:<span style={{color:C.muted}}>-</span>}</td>}
                          <td style={{padding:"5px 6px",textAlign:"center"}}>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                              <input type="number" min="0" value={c} onChange={e=>setCant(p.cod,e.target.value,p.bulto)}
                                style={{width:54,textAlign:"center",border:"2px solid "+(p.sR===0?C.red:C.gold),borderRadius:7,padding:4,fontSize:13,fontWeight:800,color:C.dark,background:p.sR===0?"#FDECEA":"#FFFDE7",outline:"none"}}/>
                              {p.bulto&&nb&&<span style={{fontSize:9,color:"#8B6914",fontWeight:600}}>{nb+"b"}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Preview orden */}
              <div style={{margin:"10px 12px 0",background:C.dark,borderRadius:12,padding:12}}>
                <div style={{fontSize:9,fontWeight:700,color:C.gold,marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Orden de Compra #{numOrden}</div>
                <div style={{fontSize:11,color:C.cream,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:130,overflowY:"auto"}}>{orden}</div>
              </div>

              {/* Numero WA */}
              <div style={{margin:"8px 12px",display:"flex",gap:8,alignItems:"center"}}>
                <div style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>Nro. proveedor:</div>
                <input type="tel" placeholder="+54 11 1234-5678" value={numWA} onChange={e=>setNumWA(e.target.value)}
                  style={{flex:1,border:"1px solid "+C.borderCard,borderRadius:8,padding:"7px 10px",fontSize:12,color:C.dark,outline:"none",background:C.card}}/>
              </div>

              {/* Botones */}
              <div style={{display:"flex",gap:6,padding:"0 12px 6px"}}>
                <button onClick={envWA} style={{flex:2,background:"#25D366",color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:13,fontWeight:800,cursor:"pointer"}}>
                  💬 Enviar por WhatsApp
                </button>
                <button onClick={copiar} style={{flex:1,background:copiado?C.green:C.cardDark,color:copiado?"#fff":C.dark,border:"1px solid "+C.borderCard,borderRadius:12,padding:"12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {copiado?"✓":"📋"}
                </button>
              </div>
              <div style={{padding:"0 12px 8px"}}>
                <button onClick={()=>descargarImagenOrden(g,cants,numOrden)}
                  style={{width:"100%",background:"#1A1410",color:C.gold,border:"1px solid "+C.border,borderRadius:12,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  🖼️ Descargar imagen de la orden
                </button>
              </div>

              {/* Marcar pedido */}
              <div style={{padding:"0 12px 12px"}}>
                <button onClick={()=>onMarcarPedido(g.prov,true)}
                  style={{width:"100%",background:C.green,color:"#fff",border:"none",borderRadius:12,padding:"11px",fontSize:13,fontWeight:800,cursor:"pointer"}}>
                  ✓ Marcar como pedido
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [wbS,setWbS]=useState(null);
  const [wbV,setWbV]=useState(null);
  const [grupos,setGrupos]=useState(null);
  const [alertas,setAlertas]=useState(null);
  const [busq,setBusq]=useState("");
  const [proc,setProc]=useState(false);
  const [err,setErr]=useState("");
  const [filtro,setFiltro]=useState("todos");
  const [dias,setDias]=useState(7);
  const [diasCustom,setDiasCustom]=useState("");
  const [cantsPorProv,setCantsPorProv]=useState({});
  const [tab,setTab]=useState("alertas");
  const [pedidosRealizados,setPedidosRealizados]=useState({});
  const [ordenCounter,setOrdenCounter]=useState(1);

  const diasFinal=diasCustom?parseInt(diasCustom)||7:dias;

  const procesar=()=>{
    if(!wbS||!wbV){setErr("Subi los dos archivos primero");return;}
    setErr("");setProc(true);setCantsPorProv({});setPedidosRealizados({});
    setTimeout(()=>{
      try{
        const stock=parseStock(wbS);
        const ventas=parseVentas(wbV);
        const gNorm=agrupar(calcular(stock,ventas,diasFinal,false));
        const gAlert=agrupar(calcular(stock,ventas,diasFinal,true));
        setGrupos(gNorm);setAlertas(gAlert);
        setTab(gAlert.length>0?"alertas":"pedidos");
      }catch(e){setErr("Error procesando los archivos.");console.error(e);}
      setProc(false);
    },100);
  };

  const handleCantChange=(prov,nuevasCants)=>{setCantsPorProv(prev=>({...prev,[prov]:nuevasCants}));};
  const marcarPedido=(prov,estado)=>{
    setPedidosRealizados(prev=>({...prev,[prov]:estado}));
    if(estado)setOrdenCounter(n=>n+1);
  };

  const listaActual=tab==="alertas"?(alertas||[]):(grupos||[]);
  const lista=listaActual.filter(g=>{
    const mb=g.nombre.toLowerCase().includes(busq.toLowerCase())||g.prov.toLowerCase().includes(busq.toLowerCase());
    const mf=filtro==="todos"||(filtro==="bulto"&&g.tieneBulto)||(filtro==="link"&&(g.esLink||g.esWeb))||(filtro==="wa"&&!g.tieneBulto&&!g.esLink&&!g.esWeb);
    return mb&&mf;
  });

  const pendientes=lista.filter(g=>!pedidosRealizados[g.prov]);
  const realizados=lista.filter(g=>pedidosRealizados[g.prov]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"Arial,sans-serif"}}>
      <style>{"*{box-sizing:border-box;margin:0;padding:0;} input[type=number]::-webkit-inner-spin-button{opacity:1;}"}</style>
      <div style={{background:C.dark,padding:"14px 18px",borderBottom:"1px solid "+C.border,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:C.cream,letterSpacing:1}}>CASA NOA</div>
            <div style={{fontSize:9,color:C.gold,letterSpacing:3,textTransform:"uppercase"}}>Gestion de Pedidos</div>
          </div>
          {grupos&&(
            <div style={{display:"flex",gap:5}}>
              {alertas&&alertas.length>0&&<div style={{background:"#C0392B22",border:"1px solid #C0392B44",borderRadius:8,padding:"5px 7px",textAlign:"center"}}>
                <div style={{fontSize:11}}>⚠️</div>
                <div style={{fontSize:15,fontWeight:700,color:C.red}}>{alertas.length}</div>
                <div style={{fontSize:7,color:C.red}}>Quiebre</div>
              </div>}
              {[["📦",grupos.filter(g=>g.tieneBulto).length,"Bulto"],["🌐",grupos.filter(g=>g.esLink||g.esWeb).length,"Web"],["💬",grupos.filter(g=>!g.tieneBulto&&!g.esLink&&!g.esWeb).length,"WA"]].map(([ic,v,lb])=>(
                <div key={lb} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"5px 7px",textAlign:"center"}}>
                  <div style={{fontSize:11}}>{ic}</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.cream}}>{v}</div>
                  <div style={{fontSize:7,color:C.creamDim}}>{lb}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"16px 14px"}}>
        {!grupos&&(
          <div style={{background:C.surface,borderRadius:20,padding:18,marginBottom:14,border:"1px solid "+C.border}}>
            <div style={{fontSize:20,fontWeight:700,color:C.cream,marginBottom:4}}>Subi los archivos de DUX</div>
            <div style={{fontSize:11,color:C.creamDim,marginBottom:16}}>Stock actualizado + ventas del periodo</div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Cuantos dias tienen las ventas?</div>
              <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                {[[7,"7 dias","Semanal"],[15,"15 dias","Quincenal"],[30,"30 dias","Mensual"],[60,"60 dias","Bimestral"]].map(([d,label,sub])=>(
                  <div key={d} onClick={()=>{setDias(d);setDiasCustom("");}}
                    style={{flex:1,minWidth:70,background:(dias===d&&!diasCustom)?C.terracotta:C.surface,border:"2px solid "+((dias===d&&!diasCustom)?C.terracotta:C.border),borderRadius:12,padding:"10px 4px",textAlign:"center",cursor:"pointer"}}>
                    <div style={{fontSize:13,fontWeight:800,color:(dias===d&&!diasCustom)?"#fff":C.cream}}>{label}</div>
                    <div style={{fontSize:9,color:(dias===d&&!diasCustom)?"rgba(255,255,255,0.8)":C.creamDim,marginTop:1}}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{fontSize:11,color:C.creamDim,whiteSpace:"nowrap"}}>O escribi los dias exactos:</div>
                <input type="number" min="1" max="365" placeholder="ej: 20" value={diasCustom}
                  onChange={e=>{setDiasCustom(e.target.value);setDias(0);}}
                  style={{width:80,border:"1px solid "+C.border,borderRadius:8,padding:"7px 10px",background:diasCustom?C.terracotta:C.surface,color:diasCustom?"#fff":C.cream,fontSize:13,fontWeight:700,outline:"none",textAlign:"center"}}/>
                {diasCustom&&<div style={{fontSize:11,color:C.gold,fontWeight:600}}>{diasCustom} dias</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <UploadZone label="Export de Stock" icon="📦" onFile={setWbS} loaded={!!wbS}/>
              <UploadZone label="Export de Ventas" icon="📈" onFile={setWbV} loaded={!!wbV}/>
            </div>
            {err&&<div style={{background:"#FDECEA",borderRadius:10,padding:"9px 12px",fontSize:12,color:C.terracotta,marginBottom:10}}>{err}</div>}
            <button onClick={procesar} disabled={!wbS||!wbV||proc}
              style={{width:"100%",background:(!wbS||!wbV)?C.border:C.terracotta,color:"#fff",border:"none",borderRadius:14,padding:15,fontSize:15,fontWeight:800,cursor:(!wbS||!wbV)?"not-allowed":"pointer",opacity:(!wbS||!wbV)?0.5:1}}>
              {proc?"Procesando...":"Generar pedidos"}
            </button>
          </div>
        )}

        {grupos&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div onClick={()=>setTab("alertas")} style={{background:tab==="alertas"?"#C0392B22":C.surface,border:"1.5px solid "+(tab==="alertas"?"#C0392B":C.border),borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:2}}>⚠️</div>
                <div style={{fontSize:18,fontWeight:800,color:tab==="alertas"?C.red:C.cream}}>{alertas?alertas.length:0}</div>
                <div style={{fontSize:10,color:tab==="alertas"?C.red:C.creamDim,fontWeight:700}}>Quiebres de stock</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>Pedir urgente</div>
              </div>
              <div onClick={()=>setTab("pedidos")} style={{background:tab==="pedidos"?C.terracotta+"22":C.surface,border:"1.5px solid "+(tab==="pedidos"?C.terracotta:C.border),borderRadius:14,padding:"12px 14px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:2}}>📋</div>
                <div style={{fontSize:18,fontWeight:800,color:tab==="pedidos"?C.terracotta:C.cream}}>{grupos?grupos.length:0}</div>
                <div style={{fontSize:10,color:tab==="pedidos"?C.terracotta:C.creamDim,fontWeight:700}}>Pedido normal</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>Periodo de {diasFinal} dias</div>
              </div>
            </div>

            {Object.values(pedidosRealizados).filter(Boolean).length>0&&(
              <div style={{background:"#3A5A3C15",border:"1px solid #3A5A3C40",borderRadius:12,padding:"10px 14px",marginBottom:10,fontSize:12,color:C.green,fontWeight:700}}>
                ✅ {Object.values(pedidosRealizados).filter(Boolean).length} pedidos realizados hoy
              </div>
            )}

            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
              {[["todos","Todos"],["bulto","Bulto"],["link","Web"],["wa","WhatsApp"]].map(([v,lb])=>(
                <button key={v} onClick={()=>setFiltro(v)} style={{background:filtro===v?C.terracotta:C.surface,color:filtro===v?"#fff":C.creamDim,border:"1px solid "+(filtro===v?C.terracotta:C.border),borderRadius:20,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer"}}>{lb}</button>
              ))}
            </div>

            <div style={{background:C.surface,borderRadius:12,display:"flex",alignItems:"center",padding:"9px 12px",gap:8,border:"1px solid "+C.border,marginBottom:10}}>
              <span style={{opacity:0.4,color:C.cream,fontSize:13}}>🔍</span>
              <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Buscar proveedor..."
                style={{border:"none",background:"transparent",flex:1,fontSize:13,color:C.cream,outline:"none"}}/>
              {busq&&<button onClick={()=>setBusq("")} style={{border:"none",background:"none",cursor:"pointer",color:C.creamDim}}>X</button>}
            </div>

            {tab==="alertas"&&alertas&&alertas.length===0&&(
              <div style={{background:"#3A5A3C15",border:"1px solid #3A5A3C40",borderRadius:14,padding:"24px",textAlign:"center",marginBottom:10}}>
                <div style={{fontSize:36,marginBottom:8}}>✅</div>
                <div style={{fontSize:14,fontWeight:700,color:C.green}}>Sin quiebres de stock</div>
              </div>
            )}

            {pendientes.map((g,i)=>(
              <Card key={g.prov} g={g} num={i+1} onCantChange={handleCantChange}
                esAlerta={tab==="alertas"} pedido={false}
                onMarcarPedido={marcarPedido} numOrden={ordenCounter+i}/>
            ))}

            {realizados.length>0&&(
              <>
                <div style={{fontSize:11,fontWeight:700,color:C.green,margin:"12px 0 6px",letterSpacing:1,textTransform:"uppercase"}}>Ya pedidos hoy</div>
                {realizados.map(g=>(
                  <Card key={g.prov} g={g} num={0} onCantChange={handleCantChange}
                    esAlerta={false} pedido={true} onMarcarPedido={marcarPedido} numOrden={0}/>
                ))}
              </>
            )}

            <button onClick={()=>{setGrupos(null);setAlertas(null);setWbS(null);setWbV(null);setBusq("");setFiltro("todos");setCantsPorProv({});setPedidosRealizados({});}}
              style={{width:"100%",background:"transparent",color:C.creamDim,border:"1px solid "+C.border,borderRadius:14,padding:12,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:14,marginBottom:32}}>
              Cargar nuevos archivos
            </button>
          </>
        )}
      </div>
    </div>
  );
}
