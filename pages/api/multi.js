const axios = require('axios');
const cheerio = require('cheerio');
const Redis = require('ioredis');

// Create a new Redis client and connect to the Redis server
const redis = new Redis(process.env.REDIS_URL);

class ResultScraper {
    constructor(rollNumber) {
        this.url = 'http://results.jntuh.ac.in/resultAction';
        // this.url = "http://202.63.105.184/results/resultAction";
        this.rollNumber = rollNumber;
        this.results = { Details: {}, Results: {} };
        this.examCodes = {
            btech: {
                R18: {
                    '1-1': ['1323', '1358', '1404', '1430', '1467', '1504', '1572', '1615', '1658'],
                    '1-2': ['1356', '1363', '1381', '1435', '1448', '1481', '1503', '1570', '1620', '1622', '1656'],
                    '2-1': ['1391', '1425', '1449', '1496', '1560', '1610', '1628', '1667', '1671'],
                    '2-2': ['1437', '1447', '1476', '1501', '1565', '1605', '1627', '1663'],
                    '3-1': ['1454', '1491', '1550', '1590', '1626', '1639', '1645', '1655', '1686'],
                    '3-2': ['1502', '1555', '1595', '1625', '1638', '1649', '1654', '1682', '1690'],
                    '4-1': ['1545', '1585', '1624', '1640', '1644', '1653', '1678'],
                    '4-2': ['1580', '1600', '1623', '1672', '1673', '1677']
                },
                R22: {
                    '1-1': ['1662']
                }
            },
            bpharmacy: {
                R17: {
                    '1-1': ['519', '537', '577', '616', '643', '683', '722', '781', '824', '832', '855'],
                    '1-2': ['517', '549', '575', '591', '648', '662', '698', '727', '779', '829', '831', '853'],
                    '2-1': ['532', '570', '638', '673', '717', '769', '819', '849', '860'],
                    '2-2': ['558', '611', '650', '661', '693', '711', '774', '814', '845'],
                    '3-1': ['597', '633', '668', '712', '759', '799', '837', '873'],
                    '3-2': ['655', '660', '688', '710', '764', '804', '841', '869', '877'],
                    '4-1': ['663', '705', '754', '794', '832', '836', '865'],
                    '4-2': ['678', '700', '789', '809', '861']
                },
                R22: {
                    '1-1': ['859']
                }
            },
            mtech: {
                R19:
                {
                    '1-1': ['319', '332', '347', '356', '371', '382', '388'],
                    '1-2': ['328', '336', '344', '353', '368', '379', '387'],
                    '2-1': ['337', '350', '365', '376', '386'],
                    '2-2': ['340', '374', '385']
                },
                R22:
                {
                    '1-1': ['389']
                }
            },
            mpharmacy: {
                R19:
                {
                    '1-1': ['161', '177', '185', '198', '209', '215'],
                    '1-2': ['157', '165', '174', '182', '195', '206', '214'],
                    '2-1': ['166', '180', '194', '204', '213'],
                    '2-2': ['169', '203', '212']
                },
                R22:
                {
                    '1-1': ['216']
                }
            },
            mba: {
                R19:
                {
                    '1-1': ['297', '316', '323', '350', '362', '368'],
                    '1-2': ['122', '293', '302', '313', '320', '347', '359', '367'],
                    '2-1': ['303', '310', '344', '356', '366'],
                    '2-2': ['120', '307', '341', '353', '365']
                },
                R22:
                {
                    '1-1': ['369']
                }
            }
        };
        this.gradesToGPA = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, 'D': 0, F: 0, 'P': 0, Ab: 0, '-': 0 };
        this.payloads = {
            btech: ['&degree=btech&etype=r17&result=null&grad=null&type=intgrade&htno=', '&degree=btech&etype=r17&result=gradercrv&grad=null&type=rcrvintgrade&htno='],
            bpharmacy: ["&degree=bpharmacy&etype=r17&result=null&grad=null&type=intgrade&htno=", "&degree=bpharmacy&etype=r17&result=gradercrv&grad=null&type=rcrvintgrade&htno="],
            mtech: ["&degree=mtech&grad=pg&etype=null&result=grade17&type=intgrade&htno=", "&degree=mtech&grad=pg&etype=r16&result=gradercrv&type=rcrvintgrade&htno="],
            mpharmacy: ["&degree=mpharmacy&grad=pg&etype=null&result=grade17&type=intgrade&htno=", "&degree=mpharmacy&grad=pg&etype=r16&result=gradercrv&type=rcrvintgrade&htno="],
            mba: ["&degree=mba&grad=pg&etype=null&result=grade17&type=intgrade&htno=", "&degree=mba&grad=pg&etype=r16&result=gradercrv&type=rcrvintgrade&htno="]
        };
    }

    async fetchResult(examCode, payload) {
        const payloadData = `?&examCode=${examCode}${payload}${this.rollNumber}`;
        const response = await axios.get(this.url + payloadData);
        return response.data;
    }

    scrapeResults(semesterCode, session_name, response) {
        const $ = cheerio.load(response);

        this.results.Results[semesterCode][session_name] = {}

        const details = $('table').eq(0).find('tr');
        const htno = details.eq(0).find('td').eq(1).text();
        const name = details.eq(0).find('td').eq(3).text();
        const fatherName = details.eq(1).find('td').eq(1).text();
        const collegeCode = details.eq(1).find('td').eq(3).text();

        this.results.Details.NAME = name;
        this.results.Details.ROLL_NO = htno;
        this.results.Details.COLLEGE_CODE = collegeCode;
        this.results.Details.FATHER_NAME = fatherName;

        var results = $('table').eq(1).find('tr');

        const resultsColumnNames = results.eq(0).find('b').map((_, element) => $(element).text()).get();
        const subjectInternalIndex = resultsColumnNames.indexOf('INTERNAL');
        const gradeIndex = resultsColumnNames.indexOf('GRADE');
        const subjectNameIndex = resultsColumnNames.indexOf('SUBJECT NAME');
        const subjectCodeIndex = resultsColumnNames.indexOf('SUBJECT CODE');
        const subjectCreditsIndex = resultsColumnNames.indexOf('CREDITS(C)');

        const subjectExternalIndex = resultsColumnNames.indexOf('EXTERNAL');
        const subjectTotalIndex = resultsColumnNames.indexOf('TOTAL');


        results = results.slice(1);
        results.each((_, resultSubject) => {
            const subjectName = $(resultSubject).find('td').eq(subjectNameIndex).text();
            const subjectCode = $(resultSubject).find('td').eq(subjectCodeIndex).text();
            const subjectGrade = $(resultSubject).find('td').eq(gradeIndex).text();
            const subjectCredits = $(resultSubject).find('td').eq(subjectCreditsIndex).text();
            const subjectInternal = $(resultSubject).find('td').eq(subjectInternalIndex).text();
            const subjectExternal = $(resultSubject).find('td').eq(subjectExternalIndex).text();
            const subjectTotal = $(resultSubject).find('td').eq(subjectTotalIndex).text();

            if (subjectCode in this.results.Results[semesterCode] &&
                this.results.Results[semesterCode][subjectCode].subject_grade !== 'F' &&
                this.results.Results[semesterCode][subjectCode].subject_grade !== 'Ab' &&
                this.results.Results[semesterCode][subjectCode].subject_grade !== '-' &&
                this.gradesToGPA[this.results.Results[semesterCode][subjectCode].subject_grade] > this.gradesToGPA[subjectGrade]) {
                return;
            }

            this.results.Results[semesterCode][session_name][subjectCode] = {
                subject_name: subjectName,
                subject_code: subjectCode,
                subject_internal: subjectInternal,
                subject_external: subjectExternal,
                subject_total: subjectTotal,
                subject_grade: subjectGrade,
                subject_credits: subjectCredits
            };
        });
        //           // Extract exam name
        //   const examName = $('h6').text();
        //   this.results.Results.exam_name = examName;

        //   console.log(examName);
    }

    async scrapeAllResults(examCode = 'all') {
        const session = axios.create();
        const tasks = {};
        var payloads = []
        var examCodes = {}
        if (this.rollNumber[5] === 'A') {
            payloads = this.payloads.btech;
            examCodes = this.examCodes.btech[this.rollNumber.startsWith('22') && this.rollNumber[4] !== '5' ? 'R22' : 'R18'];
        } else if (this.rollNumber[5] === 'R') {
            payloads = this.payloads.bpharmacy;
            examCodes = this.examCodes.bpharmacy[this.rollNumber.startsWith('22') && this.rollNumber[4] !== '5' ? 'R22' : 'R17'];
        } else if (this.rollNumber[5] == 'D') {
            payloads = this.payloads.mtech;
            examCodes = this.examCodes.mtech[this.rollNumber.startsWith('22') ? 'R22' : 'R19'];
        } else if (this.rollNumber[5] == 'S') {
            payloads = this.payloads.mpharmacy;
            examCodes = this.examCodes.mpharmacy[this.rollNumber.startsWith('22') ? 'R22' : 'R19'];
        } else if (this.rollNumber[5] == 'E') {
            payloads = this.payloads.mba;
            examCodes = this.examCodes.mba[this.rollNumber.startsWith('22') ? 'R22' : 'R19'];
        }

        if (this.rollNumber[4] === '5') {
            delete examCodes['1-1'];
            delete examCodes['1-2'];
        }

        if (examCode !== 'all') {
            examCodes = { [examCode]: examCodes[examCode] };
        }

        for (const examCode in examCodes) {
            tasks[examCode] = [];

            for (const code of examCodes[examCode]) {
                for (const payload of payloads) {
                    try {
                        const task = this.fetchResult(code, payload);
                        tasks[examCode].push(task);
                    } catch (error) {
                        console.error(this.rollNumber, error);
                    }
                }
            }
        }

        for (const examCode in tasks) {
            this.results.Results[examCode] = {};

            try {
                const responses = await Promise.all(tasks[examCode]);

                for (const response of responses) {
                    if (!response.includes('Enter HallTicket Number')) {
                        const $ = cheerio.load(response);
                        const session_name = $('h6').text();
                        this.scrapeResults(examCode, session_name, response);
                    }
                }

                if (Object.keys(this.results.Results[examCode]).length === 0) {
                    delete this.results.Results[examCode];
                }
            } catch (e) {
                console.log(this.rollNumber, e);
                console.error(this.rollNumber, e);
            }
        }
        return this.results;
    }

    async run() {
        return await this.scrapeAllResults();
    }
}


export default async function handler(req, res) {

    // List of allowed origins
    const allowedOrigins = [
        "https://resultsjntuh.vercel.app",
        "https://resultsjntuh.netlify.app",
        "http://localhost:3000"
    ];

    // Get the origin of the request
    const origin = req.headers.origin;

    // Check if the request's origin is in the list of allowed origins
    if (allowedOrigins.includes(origin)) {
        // Set the Access-Control-Allow-Origin header to the request's origin
        res.setHeader("Access-Control-Allow-Origin", origin);
        console.log('Access Granted')
    } else {
        // Origin is not in the list of allowed origins
        // You can choose to handle this case based on your requirements
        console.log("Access Denied For This Origin Domain: " + origin);
        res.status(403).json("Forbidden");
        return;
    }

    // Set CORS headers to allow requests from any origin
    // res.setHeader('Access-Control-Allow-Origin', '*');

    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000, https://resultsjntuh.vercel.app, https://resultsjntuh.netlify.app');

    // Optionally, you can set other CORS headers if needed
    // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const startTime = performance.now();
    const rollNumber = req.query['htno'];
    const htnos = req.query['htnos']; // Parameter for multiple roll numbers separated by commas
    const examCode = req.query['code']; // New parameter for specifying the exam code
    const scraper = new ResultScraper(rollNumber);

    if (examCode) {
        scraper.scrapeAllResults(examCode) // Call the new method
            .then(results => {
                // const rollResult = results["Results"];
                // const totalResult = rollResult["Total"];
                // if (!totalResult || Object.keys(totalResult).length === 0) {
                //     // Skip this result if it is empty and return null
                //     console.log(rollNumber, 'Empty result');
                //     return null;
                // }
                const endTime = performance.now();
                console.log(rollNumber, 'Time taken:', endTime - startTime, 'seconds');
                res.status(200).json(results);
            })
            // .then(result => {
            //     // Filter out null results and send an empty response if all results are empty
            //     const filteredResults = result.filter(r => r !== null);
            //     if (filteredResults.length === 0) {
            //         console.log('All results are empty');
            //         res.status(200).json({});
            //     } else {
            //         res.status(200).json(filteredResults);
            //     }
            // })
            .catch(error => {
                console.error(error);
                res.status(500).json("Internal Server Error - 500");
            });
    } else if (rollNumber) {
        scraper.run()
            .then(results => {
                // const rollResult = results["Results"];
                // const totalResult = rollResult["Total"];
                // if (!totalResult || Object.keys(totalResult).length === 0) {
                //     // Skip this result if it is empty and return null
                //     console.log(rollNumber, 'Empty result');
                //     return null;
                // }
                const endTime = performance.now();
                console.log(rollNumber, 'Time taken:', endTime - startTime, 'seconds');

                // Set the data in Redis with the specified key and expiration time
                const jsonString = JSON.stringify(results);
                redis.set(rollNumber, jsonString, 'EX', 6 * 3600)
                    .then(() => {
                        console.log('Data has been set in the Redis cache.');
                    })
                    .catch((error) => {
                        console.error('Error setting data in the Redis cache:', error);
                    });

                res.status(200).json(results);
            })
            // .then(result => {
            //     // Filter out null results and send an empty response if all results are empty
            //     const filteredResults = result.filter(r => r !== null);
            //     if (filteredResults.length === 0) {
            //         console.log('All results are empty');
            //         res.status(200).json({});
            //     } else {
            //         res.status(200).json(filteredResults);
            //     }
            // })
            .catch(error => {
                console.error(error);
                res.status(500).json("Internal Server Error");
                console.log(htno, "results failed to fetch")
                res.end();
            });
    } else if (htnos) {
        const rollNumbers = htnos.split(",");
        const resultsPromises = rollNumbers.map(number => {
            const scraper = new ResultScraper(number.trim());
            return scraper.run()
                .then(results => {
                    const rollResult = results["Results"];
                    const totalResult = rollResult["Total"];
                    if (!totalResult) {
                        // Skip this result and proceed to the next roll number
                        return null;
                    }
                    return results;
                })
                .catch(error => {
                    console.error(error);
                    return null;
                });
        });

        Promise.all(resultsPromises)
            .then(results => {
                const validResults = results.filter(result => result !== null);
                const endTime = performance.now();
                console.log(rollNumbers, "Multiple Roll Numbers", 'Time taken:', endTime - startTime, 'seconds');
                res.status(200).json(validResults);
            })
            .catch(error => {
                console.error(error);
                res.status(500).json("Internal Server Error");
            });
    } else {
        res.status(400).json("Bad Request");
    }
}

export const config = {
    api: {
        externalResolver: true,
    },
}
