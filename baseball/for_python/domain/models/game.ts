import * as moment from "moment";

export class Game {
  constructor(
    public readonly id: number | null,
    public readonly date: string,
    public readonly awayTeamInitial: string,
    public readonly homeTeamInitial: string,
    public readonly gameNo: string,
    public readonly isNoGame: boolean
  ) {}

  public isOpeningGame(year: string): boolean {
    const dateObj = moment(this.date, "YYYYMMDD");
    return dateObj.isSameOrAfter(moment(`${year}-02-22`)) && dateObj.isSameOrBefore(moment(`${year}-03-26`));
  }

  public isRegularSeason(year: string): boolean {
    const dateObj = moment(this.date, "YYYYMMDD");
    return (
      (dateObj.isSameOrAfter(moment(`${year}-03-27`)) && dateObj.isSameOrBefore(moment(`${year}-07-27`))) ||
      (dateObj.isSameOrAfter(moment(`${year}-07-30`)) && dateObj.isSameOrBefore(moment(`${year}-10-10`)))
    );
  }

  public isInterLeague(year: string): boolean {
    const dateObj = moment(this.date, "YYYYMMDD");
    return dateObj.isSameOrAfter(moment(`${year}-05-25`)) && dateObj.isSameOrBefore(moment(`${year}-06-17`));
  }

  public isClimaxSeries(year: string): boolean {
    const dateObj = moment(this.date, "YYYYMMDD");
    return dateObj.isSameOrAfter(moment(`${year}-10-11`)) && dateObj.isSameOrBefore(moment(`${year}-10-24`));
  }

  public isJapanSeries(year: string): boolean {
    const dateObj = moment(this.date, "YYYYMMDD");
    return dateObj.isSameOrAfter(moment(`${year}-10-25`)) && dateObj.isSameOrBefore(moment(`${year}-11-03`));
  }
}
